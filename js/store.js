/* ============================================================
   HORA — ชั้นเก็บข้อมูล
   มี Supabase → ใช้ Supabase | ไม่มี → เก็บในเครื่อง (localStorage)
   สลับได้อัตโนมัติ โค้ดฝั่ง UI เรียกใช้เหมือนกันทุกกรณี
   ============================================================ */

const Store = (() => {

  const LS_KEY = 'hora.data.v1';
  let sb = null;              // Supabase client
  let mode = 'local';         // 'local' | 'cloud'
  let hasCompanies = true;    // ตาราง companies พร้อมใช้ไหม (ยังไม่ได้รัน migration = false)
  let hasPrediction = true;   // คอลัมน์ prediction พร้อมใช้ไหม
  let hasChartUrls = true;    // คอลัมน์ chart_urls (รูปหลายรูป) พร้อมใช้ไหม
  let hasParent = true;       // คอลัมน์ companies.parent_id (บริษัทแม่-ลูก) พร้อมใช้ไหม
  let cache = { companies: [], departments: [], employees: [] };

  /* ---------- เริ่มต้น ---------- */

  async function init(cfg) {
    if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
      try {
        sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
        // ทดสอบว่าต่อได้จริง
        const { error } = await sb.from('departments').select('id').limit(1);
        if (error) throw error;
        mode = 'cloud';
      } catch (e) {
        console.warn('[HORA] ต่อ Supabase ไม่ได้ ใช้โหมดเก็บในเครื่องแทน:', e.message);
        sb = null;
        mode = 'local';
      }
    }
    await load();
    return mode;
  }

  function getMode() { return mode; }

  /* ---------- โหลดข้อมูลทั้งหมด ---------- */

  async function load() {
    if (mode === 'cloud') {
      const [c, d, e] = await Promise.all([
        sb.from('companies').select('*').order('sort_order'),
        sb.from('departments').select('*').order('sort_order'),
        sb.from('employees').select('*').order('sort_order')
      ]);
      if (d.error) throw d.error;
      if (e.error) throw e.error;

      // ตรวจว่ามีคอลัมน์ prediction / chart_urls ไหม
      if (e.data.length) {
        hasPrediction = 'prediction' in e.data[0];
        hasChartUrls  = 'chart_urls' in e.data[0];
      } else {
        const [p1, p2] = await Promise.all([
          sb.from('employees').select('prediction').limit(1),
          sb.from('employees').select('chart_urls').limit(1)
        ]);
        hasPrediction = !p1.error;
        hasChartUrls  = !p2.error;
      }

      // ยังไม่ได้รัน migration-companies.sql → ทำงานต่อได้ แค่ไม่มีชั้นบริษัท
      hasCompanies = !c.error;
      if (c.error) {
        console.warn('[HORA] ยังไม่มีตาราง companies — รัน docs/setup-all.sql ก่อน');
        cache.companies = [];
      } else {
        cache.companies = c.data.map(fromRowCompany);
        hasParent = c.data.length === 0 || 'parent_id' in c.data[0];
      }

      cache.departments = d.data.map(fromRowDept);
      cache.employees   = e.data.map(fromRowEmp);
    } else {
      const raw = localStorage.getItem(LS_KEY);
      cache = raw ? JSON.parse(raw) : {};
      cache.companies   = cache.companies   || [];
      cache.departments = cache.departments || [];
      cache.employees   = cache.employees   || [];
      // แปลงข้อมูลเก่า (รูปเดี่ยว chartUrl) → ลิสต์รูป chartUrls
      cache.employees.forEach(e => {
        if (!Array.isArray(e.chartUrls)) e.chartUrls = e.chartUrl ? [e.chartUrl] : [];
      });
      cache.companies.forEach(c => { if (c.parentId === undefined) c.parentId = null; });
    }
    return cache;
  }

  /** ตาราง companies พร้อมใช้ไหม */
  function companiesReady() { return mode === 'local' || hasCompanies; }

  function all() { return cache; }

  /* ---------- แปลงรูปแบบ DB ↔ แอป ---------- */

  const fromRowCompany = r => ({
    id: r.id, name: r.name, parentId: r.parent_id ?? null, sortOrder: r.sort_order ?? 0
  });
  const toRowCompany = c => {
    const row = { id: c.id, name: c.name, sort_order: c.sortOrder ?? 0 };
    if (hasParent) row.parent_id = c.parentId || null;
    return row;
  };

  const fromRowDept = r => ({
    id: r.id, name: r.name, companyId: r.company_id ?? null, sortOrder: r.sort_order ?? 0
  });
  const toRowDept = d => {
    const row = { id: d.id, name: d.name, sort_order: d.sortOrder ?? 0 };
    if (companiesReady()) row.company_id = d.companyId || null;
    return row;
  };

  const fromRowEmp = r => ({
    id: r.id,
    nickname: r.nickname,
    position: r.position,
    companyId: r.company_id ?? null,
    departmentId: r.department_id,
    managerId: r.manager_id,
    birthDate: r.birth_date,
    // Postgres คืน time เป็น "09:15:00" — ตัดวินาทีทิ้งให้ตรงกับ <input type=time>
    birthTime: r.birth_time ? String(r.birth_time).slice(0, 5) : null,
    birthProvince: r.birth_province,
    chartUrls: readChartList(r),
    prediction: r.prediction ?? '',
    sortOrder: r.sort_order ?? 0
  });

  /** รวมรูปจากคอลัมน์ใหม่ (chart_urls) และของเดิม (chart_url) ให้เป็นลิสต์เดียว */
  function readChartList(r) {
    const arr = Array.isArray(r.chart_urls) ? r.chart_urls.filter(Boolean) : [];
    if (arr.length) return arr;
    return r.chart_url ? [r.chart_url] : [];
  }
  const toRowEmp = e => {
    const row = {
      id: e.id,
      nickname: e.nickname,
      position: e.position,
      department_id: e.departmentId,
      manager_id: e.managerId,
      birth_date: e.birthDate || null,
      birth_time: e.birthTime || null,
      birth_province: e.birthProvince || null,
      sort_order: e.sortOrder ?? 0
    };
    const charts = Array.isArray(e.chartUrls) ? e.chartUrls.filter(Boolean) : [];
    row.chart_url = charts[0] || null;              // รูปแรก — คอลัมน์เดิม กันข้อมูลย้อนหลัง
    if (hasChartUrls) row.chart_urls = charts;      // รูปทั้งหมด — คอลัมน์ใหม่
    if (companiesReady()) row.company_id = e.companyId || null;
    if (hasPrediction) row.prediction = e.prediction || null;
    return row;
  };

  /* ---------- บันทึกลงเครื่อง ---------- */

  function persistLocal() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(cache));
    } catch (e) {
      throw new Error('พื้นที่เก็บในเครื่องเต็ม — ลองลบรูปดวงบางรูป หรือตั้งค่า Supabase');
    }
  }

  const uid = () =>
    (crypto.randomUUID ? crypto.randomUUID()
     : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9));

  /* ---------- บริษัท ---------- */

  async function saveCompany(company) {
    if (!companiesReady()) {
      throw new Error('ยังไม่ได้สร้างตารางบริษัท — รัน docs/migration-companies.sql ใน Supabase ก่อน');
    }
    if (!company.id) {
      company.id = uid();
      company.sortOrder = cache.companies.length;
    }
    const i = cache.companies.findIndex(c => c.id === company.id);
    if (i >= 0) cache.companies[i] = { ...cache.companies[i], ...company };
    else cache.companies.push(company);

    if (mode === 'cloud') {
      const { error } = await sb.from('companies').upsert(toRowCompany(company));
      if (error) throw error;
    } else persistLocal();
    return company;
  }

  async function deleteCompany(id) {
    // แผนก/พนักงานในบริษัทนี้ไม่ถูกลบ แค่ย้ายออกไปกลุ่ม "ยังไม่ระบุบริษัท"
    // บริษัทลูก (ถ้ามี) เลื่อนขึ้นเป็นบริษัทระดับบนสุด
    cache.departments.forEach(d => { if (d.companyId === id) d.companyId = null; });
    cache.employees.forEach(e => { if (e.companyId === id) e.companyId = null; });
    cache.companies.forEach(c => { if (c.parentId === id) c.parentId = null; });
    cache.companies = cache.companies.filter(c => c.id !== id);

    if (mode === 'cloud') {
      await sb.from('departments').update({ company_id: null }).eq('company_id', id);
      await sb.from('employees').update({ company_id: null }).eq('company_id', id);
      if (hasParent) await sb.from('companies').update({ parent_id: null }).eq('parent_id', id);
      const { error } = await sb.from('companies').delete().eq('id', id);
      if (error) throw error;
    } else persistLocal();
  }

  /* ---------- แผนก ---------- */

  async function saveDepartment(dept) {
    if (!dept.id) {
      dept.id = uid();
      dept.sortOrder = cache.departments.length;
    }
    const i = cache.departments.findIndex(d => d.id === dept.id);
    if (i >= 0) cache.departments[i] = { ...cache.departments[i], ...dept };
    else cache.departments.push(dept);

    if (mode === 'cloud') {
      const { error } = await sb.from('departments').upsert(toRowDept(dept));
      if (error) throw error;
    } else persistLocal();
    return dept;
  }

  async function deleteDepartment(id) {
    // พนักงานในแผนกนี้จะถูกย้ายออกจากแผนก (ไม่ลบทิ้ง)
    cache.employees.forEach(e => {
      if (e.departmentId === id) e.departmentId = null;
    });
    cache.departments = cache.departments.filter(d => d.id !== id);

    if (mode === 'cloud') {
      await sb.from('employees').update({ department_id: null }).eq('department_id', id);
      const { error } = await sb.from('departments').delete().eq('id', id);
      if (error) throw error;
    } else persistLocal();
  }

  /* ---------- พนักงาน ---------- */

  async function saveEmployee(emp) {
    if (!emp.id) {
      emp.id = uid();
      emp.sortOrder = cache.employees.length;
    }
    const i = cache.employees.findIndex(e => e.id === emp.id);
    if (i >= 0) cache.employees[i] = { ...cache.employees[i], ...emp };
    else cache.employees.push(emp);

    if (mode === 'cloud') {
      const { error } = await sb.from('employees').upsert(toRowEmp(emp));
      if (error) throw error;
    } else persistLocal();
    return emp;
  }

  async function deleteEmployee(id) {
    // ลูกน้องเลื่อนขึ้นไปอยู่ใต้หัวหน้าของคนที่ถูกลบ
    const target = cache.employees.find(e => e.id === id);
    const newManager = target ? target.managerId : null;
    const children = cache.employees.filter(e => e.managerId === id);
    children.forEach(c => { c.managerId = newManager; });
    cache.employees = cache.employees.filter(e => e.id !== id);

    if (mode === 'cloud') {
      for (const c of children) {
        await sb.from('employees').update({ manager_id: newManager }).eq('id', c.id);
      }
      const { error } = await sb.from('employees').delete().eq('id', id);
      if (error) throw error;
    } else persistLocal();
  }

  /* ---------- รูปดวง ---------- */

  /** ย่อ/บีบอัดรูปก่อนเก็บ เพื่อไม่ให้เปลืองพื้นที่ */
  function compressImage(file, maxSide = 1400, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width: w, height: h } = img;
        if (Math.max(w, h) > maxSide) {
          const s = maxSide / Math.max(w, h);
          w = Math.round(w * s); h = Math.round(h * s);
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d');
        g.fillStyle = '#ffffff';           // กันรูป PNG โปร่งใสกลายเป็นดำ
        g.fillRect(0, 0, w, h);
        g.drawImage(img, 0, 0, w, h);
        c.toBlob(b => b ? resolve({ blob: b, dataUrl: c.toDataURL('image/jpeg', quality) })
                        : reject(new Error('บีบอัดรูปไม่สำเร็จ')),
                 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('เปิดไฟล์รูปไม่ได้')); };
      img.src = url;
    });
  }

  /** อัปโหลดรูปดวง คืนค่า URL (cloud) หรือ dataURL (local)
   *  suffix ช่วยกันชื่อไฟล์ชนกันเวลาอัปโหลดหลายรูปรวดเดียว */
  async function uploadChart(file, employeeId, suffix = '') {
    if (!file.type.startsWith('image/')) throw new Error('กรุณาเลือกไฟล์รูปภาพ');
    const { blob, dataUrl } = await compressImage(file);

    if (mode === 'cloud') {
      const rand = Math.random().toString(36).slice(2, 8);
      const path = `charts/${employeeId}-${Date.now()}-${suffix}${rand}.jpg`;
      const { error } = await sb.storage.from('charts')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      const { data } = sb.storage.from('charts').getPublicUrl(path);
      return data.publicUrl;
    }
    return dataUrl;
  }

  /* ---------- นำเข้า / ส่งออก ---------- */

  function exportJSON() {
    return JSON.stringify(cache, null, 2);
  }

  async function importJSON(text) {
    const data = JSON.parse(text);
    if (!data.employees || !data.departments) {
      throw new Error('ไฟล์ไม่ถูกต้อง — ต้องมี departments และ employees');
    }
    cache = data;
    cache.companies = cache.companies || [];
    if (mode === 'cloud') {
      if (companiesReady()) {
        for (const c of cache.companies) await sb.from('companies').upsert(toRowCompany(c));
      }
      for (const d of cache.departments) await sb.from('departments').upsert(toRowDept(d));
      for (const e of cache.employees)   await sb.from('employees').upsert(toRowEmp(e));
    } else persistLocal();
  }

  return {
    init, load, all, getMode, companiesReady,
    saveCompany, deleteCompany,
    saveDepartment, deleteDepartment,
    saveEmployee, deleteEmployee,
    uploadChart, exportJSON, importJSON
  };
})();

window.Store = Store;
