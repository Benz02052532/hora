-- ============================================================
-- HORA — เพิ่มชั้น "บริษัท" สำหรับโครงสร้างแบบโฮลดิ้ง
--
-- โครงสร้างใหม่:  บริษัท → แผนก → พนักงาน
--
-- วิธีใช้: copy ทั้งไฟล์ → วางใน Supabase > SQL Editor → กด Run
-- ปลอดภัยกับข้อมูลเดิม: ใช้ IF NOT EXISTS ทั้งหมด รันซ้ำได้ไม่พัง
-- ข้อมูลพนักงาน/แผนกที่มีอยู่แล้วจะไปอยู่กลุ่ม "ยังไม่ระบุบริษัท"
-- แล้วค่อยย้ายเข้าบริษัททีหลังในหน้าเว็บได้
-- ============================================================

create table if not exists public.companies (
  id          text primary key,
  name        text not null,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

-- ผูกแผนกและพนักงานเข้ากับบริษัท (ว่างได้ = ยังไม่ระบุ)
alter table public.departments
  add column if not exists company_id text references public.companies(id) on delete set null;

alter table public.employees
  add column if not exists company_id text references public.companies(id) on delete set null;

create index if not exists departments_company_idx on public.departments(company_id);
create index if not exists employees_company_idx   on public.employees(company_id);

-- สิทธิ์เข้าถึงผ่าน Data API
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.companies to anon, authenticated;

alter table public.companies enable row level security;

drop policy if exists "hora_public_companies" on public.companies;
create policy "hora_public_companies"
  on public.companies for all
  to anon, authenticated
  using (true) with check (true);

-- ============================================================
-- เสร็จแล้ว! ควรเห็น "Success. No rows returned"
-- ============================================================
