/* ============================================================
   HORA — ชั้นเก็บข้อมูล
   มี Supabase → ใช้ Supabase | ไม่มี → เก็บในเครื่อง (localStorage)
   สลับได้อัตโนมัติ โค้ดฝั่ง UI เรียกใช้เหมือนกันทุกกรณี
   ============================================================ */

const Store = (() => {

  const LS_KEY = 'hora.data.v1';
  let sb = null;              // Supabase client
  let mode = 'local';         // 'local' | 'cloud'
  let cache = { departments: [], employees: [] };

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
      const [d, e] = await Promise.all([
        sb.from('departments').select('*').order('sort_order'),
        sb.from('employees').select('*').order('sort_order')
      ]);
      if (d.error) throw d.error;
      if (e.error) throw e.error;
      cache.departments = d.data.map(fromRowDept);
      cache.employees   = e.data.map(fromRowEmp);
    } else {
      const raw = localStorage.getItem(LS_KEY);
      cache = raw ? JSON.parse(raw) : { departments: [], employees: [] };
      if (!cache.departments) cache.departments = [];
      if (!cache.employees) cache.employees = [];
    }
    return cache;
  }

  function all() { return cache; }

  /* ---------- แปลงรูปแบบ DB ↔ แอป ---------- */

  const fromRowDept = r => ({
    id: r.id, name: r.name, sortOrder: r.sort_order ?? 0
  });
  const toRowDept = d => ({
    id: d.id, name: d.name, sort_order: d.sortOrder ?? 0
  });

  const fromRowEmp = r => ({
    id: r.id,
    nickname: r.nickname,
    position: r.position,
    departmentId: r.department_id,
    managerId: r.manager_id,
    birthDate: r.birth_date,
    // Postgres คืน time เป็น "09:15:00" — ตัดวินาทีทิ้งให้ตรงกับ <input type=time>
    birthTime: r.birth_time ? String(r.birth_time).slice(0, 5) : null,
    birthProvince: r.birth_province,
    chartUrl: r.chart_url,
    sortOrder: r.sort_order ?? 0
  });
  const toRowEmp = e => ({
    id: e.id,
    nickname: e.nickname,
    position: e.position,
    department_id: e.departmentId,
    manager_id: e.managerId,
    birth_date: e.birthDate || null,
    birth_time: e.birthTime || null,
    birth_province: e.birthProvince || null,
    chart_url: e.chartUrl || null,
    sort_order: e.sortOrder ?? 0
  });

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

  /** อัปโหลดรูปดวง คืนค่า URL (cloud) หรือ dataURL (local) */
  async function uploadChart(file, employeeId) {
    if (!file.type.startsWith('image/')) throw new Error('กรุณาเลือกไฟล์รูปภาพ');
    const { blob, dataUrl } = await compressImage(file);

    if (mode === 'cloud') {
      const path = `charts/${employeeId}-${Date.now()}.jpg`;
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
    if (mode === 'cloud') {
      for (const d of cache.departments) await sb.from('departments').upsert(toRowDept(d));
      for (const e of cache.employees)   await sb.from('employees').upsert(toRowEmp(e));
    } else persistLocal();
  }

  return {
    init, load, all, getMode,
    saveDepartment, deleteDepartment,
    saveEmployee, deleteEmployee,
    uploadChart, exportJSON, importJSON
  };
})();

window.Store = Store;
