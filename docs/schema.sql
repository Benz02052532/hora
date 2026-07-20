-- ============================================================
-- HORA — สร้างตารางสำหรับผังองค์กร
-- วิธีใช้: copy ทั้งไฟล์นี้ → วางใน Supabase > SQL Editor → กด Run
-- ============================================================

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

-- ดัชนีช่วยให้ค้นเร็วขึ้น
create index if not exists employees_department_idx on public.employees(department_id);
create index if not exists employees_manager_idx    on public.employees(manager_id);


-- ============================================================
-- นโยบายความปลอดภัย (RLS)
-- ============================================================
-- ⚠️ อ่านตรงนี้ก่อน:
--
-- คุณเลือกวิธี "ฝังรหัสผ่านในโค้ด" (ไม่ใช้ระบบ login ของ Supabase)
-- แปลว่าหน้าเว็บเชื่อมต่อฐานข้อมูลด้วย anon key ซึ่งเปิดเผยในโค้ด
-- ดังนั้นต้องเปิดสิทธิ์ให้ anon อ่าน/เขียนได้ ไม่งั้นเว็บจะใช้งานไม่ได้เลย
--
-- ผลที่ตามมา: ใครที่รู้ URL โปรเจกต์ + anon key (ดูได้จาก view-source)
-- จะดึงข้อมูลวันเกิดพนักงานทั้งหมดได้ แม้ไม่รู้รหัสผ่านหน้าเว็บ
--
-- คุณรับทราบข้อนี้แล้วตอนเลือกข้อ B
-- ถ้าเปลี่ยนใจอยากปลอดภัยจริง บอกผมได้ ผมเปลี่ยนให้เป็น Supabase Auth
-- (ใช้บัญชีกลาง 1 บัญชี — สำหรับผู้ใช้ยังกรอกแค่รหัสเดียวเหมือนเดิม)
-- ============================================================

-- ให้สิทธิ์ผ่าน Data API (เผื่อกรณีปิด "Automatically expose new tables" ไว้)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.departments to anon, authenticated;
grant select, insert, update, delete on public.employees   to anon, authenticated;

alter table public.departments enable row level security;
alter table public.employees   enable row level security;

drop policy if exists "hora_public_departments" on public.departments;
create policy "hora_public_departments"
  on public.departments for all
  to anon, authenticated
  using (true) with check (true);

drop policy if exists "hora_public_employees" on public.employees;
create policy "hora_public_employees"
  on public.employees for all
  to anon, authenticated
  using (true) with check (true);


-- ============================================================
-- ที่เก็บรูปดวง (Storage)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('charts', 'charts', true)
on conflict (id) do nothing;

drop policy if exists "hora_charts_read"   on storage.objects;
drop policy if exists "hora_charts_write"  on storage.objects;
drop policy if exists "hora_charts_update" on storage.objects;
drop policy if exists "hora_charts_delete" on storage.objects;

create policy "hora_charts_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'charts');

create policy "hora_charts_write"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'charts');

create policy "hora_charts_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'charts');

create policy "hora_charts_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'charts');


-- ============================================================
-- เสร็จแล้ว! ควรเห็นข้อความ "Success. No rows returned"
-- ============================================================
