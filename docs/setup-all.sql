-- ============================================================
-- HORA — ติดตั้งฐานข้อมูลทั้งหมดในไฟล์เดียว
--
-- รันไฟล์นี้ไฟล์เดียวจบ ครอบคลุมทุกฟีเจอร์
-- ปลอดภัยแม้รันซ้ำ (IF NOT EXISTS ทั้งหมด — ของที่มีแล้วจะข้าม ไม่พัง ไม่ลบข้อมูล)
--
-- วิธีใช้: copy ทั้งไฟล์ → Supabase > SQL Editor → Run
-- ============================================================

-- ---------- ตารางบริษัท (โครงสร้างโฮลดิ้ง) ----------
create table if not exists public.companies (
  id          text primary key,
  name        text not null,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

-- ---------- ตารางแผนก ----------
create table if not exists public.departments (
  id          text primary key,
  name        text not null,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

-- ---------- ตารางพนักงาน ----------
create table if not exists public.employees (
  id              text primary key,
  nickname        text not null,
  position        text,
  department_id   text references public.departments(id) on delete set null,
  manager_id      text references public.employees(id)   on delete set null,
  birth_date      date,
  birth_time      time,
  birth_province  text,
  chart_url       text,
  sort_order      integer default 0,
  created_at      timestamptz default now()
);

-- ---------- คอลัมน์เพิ่มเติม (ฟีเจอร์ที่เพิ่มภายหลัง) ----------
-- บริษัทแม่-ลูก (โครงสร้างต้นไม้เครือบริษัท)
alter table public.companies
  add column if not exists parent_id text references public.companies(id) on delete set null;
alter table public.departments
  add column if not exists company_id text references public.companies(id) on delete set null;
alter table public.employees
  add column if not exists company_id text references public.companies(id) on delete set null;
alter table public.employees
  add column if not exists prediction text;
alter table public.employees
  add column if not exists chart_urls jsonb default '[]'::jsonb;

-- ย้ายรูปเดิม (รูปเดี่ยว) เข้าไปในลิสต์รูปใหม่ ให้แสดงต่อเนื่องไม่หาย
update public.employees
   set chart_urls = jsonb_build_array(chart_url)
 where chart_url is not null
   and (chart_urls is null or chart_urls = '[]'::jsonb);

-- ---------- ดัชนี ----------
create index if not exists employees_department_idx on public.employees(department_id);
create index if not exists employees_manager_idx    on public.employees(manager_id);
create index if not exists employees_company_idx    on public.employees(company_id);
create index if not exists departments_company_idx  on public.departments(company_id);
create index if not exists companies_parent_idx      on public.companies(parent_id);

-- ---------- สิทธิ์เข้าถึงผ่าน Data API ----------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.companies   to anon, authenticated;
grant select, insert, update, delete on public.departments to anon, authenticated;
grant select, insert, update, delete on public.employees   to anon, authenticated;

-- ---------- นโยบายความปลอดภัย (RLS) ----------
-- ⚠️ ระบบใช้รหัสผ่านฝังในโค้ด anon จึงต้องเข้าถึงข้อมูลได้
--    ใครรู้ URL + anon key (เห็นจาก view-source) จะดึงข้อมูลได้
--    ถ้าต้องการปลอดภัยจริง เปลี่ยนไปใช้ Supabase Auth
alter table public.companies   enable row level security;
alter table public.departments enable row level security;
alter table public.employees   enable row level security;

drop policy if exists "hora_public_companies"   on public.companies;
create policy "hora_public_companies"   on public.companies   for all to anon, authenticated using (true) with check (true);

drop policy if exists "hora_public_departments" on public.departments;
create policy "hora_public_departments" on public.departments for all to anon, authenticated using (true) with check (true);

drop policy if exists "hora_public_employees"   on public.employees;
create policy "hora_public_employees"   on public.employees   for all to anon, authenticated using (true) with check (true);

-- ---------- ที่เก็บรูปดวง (Storage) ----------
insert into storage.buckets (id, name, public)
values ('charts', 'charts', true)
on conflict (id) do nothing;

drop policy if exists "hora_charts_read"   on storage.objects;
drop policy if exists "hora_charts_write"  on storage.objects;
drop policy if exists "hora_charts_update" on storage.objects;
drop policy if exists "hora_charts_delete" on storage.objects;

create policy "hora_charts_read"   on storage.objects for select to anon, authenticated using (bucket_id = 'charts');
create policy "hora_charts_write"  on storage.objects for insert to anon, authenticated with check (bucket_id = 'charts');
create policy "hora_charts_update" on storage.objects for update to anon, authenticated using (bucket_id = 'charts');
create policy "hora_charts_delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'charts');

-- ============================================================
-- เสร็จ! ควรเห็น "Success. No rows returned"
-- ============================================================
