-- ============================================================
-- HORA — รองรับรูปดวงหลายรูปต่อคน
-- วิธีใช้: copy → วางใน Supabase > SQL Editor → Run
-- ปลอดภัยกับข้อมูลเดิม: รูปเดิมในคอลัมน์ chart_url ยังใช้ได้ตามปกติ
-- ============================================================

alter table public.employees
  add column if not exists chart_urls jsonb default '[]'::jsonb;

-- ย้ายรูปเดิม (ถ้ามี) เข้าไปในลิสต์รูปใหม่ ให้แสดงต่อเนื่องไม่หาย
update public.employees
   set chart_urls = jsonb_build_array(chart_url)
 where chart_url is not null
   and (chart_urls is null or chart_urls = '[]'::jsonb);

-- ============================================================
-- เสร็จแล้ว! ควรเห็น "Success. No rows returned" (หรือจำนวนแถวที่อัปเดต)
-- ============================================================
