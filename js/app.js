/* ============================================================
   HORA — ตรรกะหน้าเว็บ
   ============================================================ */

(() => {

const CFG = window.HORA_CONFIG;
const $  = id => document.getElementById(id);

/* ---------- ข้อมูลอ้างอิง ---------- */

const PROVINCES = [
  'กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น','จันทบุรี',
  'ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','เชียงใหม่','ตรัง','ตราด',
  'ตาก','นครนายก','นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์','นนทบุรี',
  'นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี',
  'พระนครศรีอยุธยา','พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์','แพร่',
  'ภูเก็ต','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง','ระยอง',
  'ราชบุรี','ลพบุรี','ลำปาง','ลำพูน','เลย','ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ',
  'สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี',
  'สุรินทร์','หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี',
  'อุบลราชธานี'
];

const TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                   'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

/* ---------- ตัวช่วย ---------- */

const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/** 2530-03-15 → "15 มีนาคม 2530" (พ.ศ.) */
function thaiDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
}

/** "08:30" หรือ "08:30:00" (Postgres คืนมามีวินาที) → "08.30 น." */
const thaiTime = t => t ? `${t.slice(0, 5).replace(':', '.')} น.` : '';

const initial = name => (name || '?').trim().charAt(0) || '?';

/* ---------- ช่องเลือกวันเดือนปีแบบไทย ---------- */
/* ไม่ใช้ <input type=date> เพราะปฏิทินของเบราว์เซอร์บังคับภาษาตามเครื่อง
   และเลือกปีเกิดย้อนหลังหลายสิบปีได้ลำบากมาก */

const THIS_YEAR_BE = new Date().getFullYear() + 543;

/** เลือกตรงกันแบบไม่ให้ 0 == '' กลายเป็นจริง */
const optTag = (v, label, sel) =>
  `<option value="${v}"${String(v) === String(sel) ? ' selected' : ''}>${label}</option>`;

/** "1990-05-20" → 3 dropdown (วัน / เดือน / ปี พ.ศ.) */
function dateSelects(iso) {
  let dd = '', mm = '', yy = '';
  if (iso) {
    const [Y, M, D] = String(iso).split('-').map(Number);
    if (Y) { yy = Y + 543; mm = M; dd = D; }
  }
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from({ length: 101 }, (_, i) => THIS_YEAR_BE - i);

  return `
    <div class="picker-row picker-date">
      <select id="f-bday" aria-label="วันที่">
        <option value="">วัน</option>
        ${days.map(d => optTag(d, d, dd)).join('')}
      </select>
      <select id="f-bmonth" aria-label="เดือน">
        <option value="">เดือน</option>
        ${TH_MONTHS.map((n, i) => optTag(i + 1, n, mm)).join('')}
      </select>
      <select id="f-byear" aria-label="ปี พ.ศ.">
        <option value="">ปี พ.ศ.</option>
        ${years.map(y => optTag(y, y, yy)).join('')}
      </select>
    </div>`;
}

/** "09:15" → 2 dropdown (ชั่วโมง / นาที) แบบ 24 ชั่วโมง */
function timeSelects(t) {
  let hh = '', mi = '';
  if (t) {
    const [H, M] = String(t).split(':');
    if (H !== undefined && H !== '') { hh = H.padStart(2, '0'); mi = (M || '00').padStart(2, '0'); }
  }
  const pad = n => String(n).padStart(2, '0');
  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const mins  = Array.from({ length: 60 }, (_, i) => pad(i));

  return `
    <div class="picker-row picker-time">
      <select id="f-bhour" aria-label="ชั่วโมง">
        <option value="">ชั่วโมง</option>
        ${hours.map(h => optTag(h, `${h} น.`, hh)).join('')}
      </select>
      <select id="f-bmin" aria-label="นาที">
        <option value="">นาที</option>
        ${mins.map(m => optTag(m, `${m} นาที`, mi)).join('')}
      </select>
    </div>`;
}

/** ซ่อนวันที่ไม่มีจริงในเดือนนั้น เช่น 31 กุมภาพันธ์ */
function syncDayOptions(ov) {
  const dSel = ov.querySelector('#f-bday');
  const m = +ov.querySelector('#f-bmonth').value;
  const yBE = +ov.querySelector('#f-byear').value;
  if (!m) return;
  const max = new Date(yBE ? yBE - 543 : 2000, m, 0).getDate();
  for (const o of dSel.options) {
    if (o.value) o.hidden = +o.value > max;
  }
  if (+dSel.value > max) dSel.value = '';
}

/** รวม 3 ช่องกลับเป็น "1990-05-20" — คืน undefined ถ้ากรอกไม่ครบ */
function readDate(ov) {
  const d = ov.querySelector('#f-bday').value;
  const m = ov.querySelector('#f-bmonth').value;
  const y = ov.querySelector('#f-byear').value;
  if (!d && !m && !y) return null;
  if (!d || !m || !y) return undefined;
  return `${y - 543}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** รวม 2 ช่องกลับเป็น "09:15" — คืน undefined ถ้ากรอกไม่ครบ */
function readTime(ov) {
  const h = ov.querySelector('#f-bhour').value;
  const m = ov.querySelector('#f-bmin').value;
  if (!h && !m) return null;
  if (!h || !m) return undefined;
  return `${h}:${m}`;
}

function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  $('toastRoot').append(t);
  setTimeout(() => {
    t.style.transition = 'opacity .35s, transform .35s';
    t.style.opacity = '0';
    t.style.transform = 'translateY(10px)';
    setTimeout(() => t.remove(), 380);
  }, 2600);
}

/* ---------- ดูรูปเต็มจอ (รองรับหลายรูป เลื่อนซ้าย-ขวา) ---------- */

function openLightbox(urls, startIndex = 0) {
  const list = Array.isArray(urls) ? urls : [urls];
  if (!list.length) return;
  let i = startIndex;

  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `
    <img src="${esc(list[i])}" alt="รูปดวง" id="lbImg">
    ${list.length > 1 ? `
      <button class="lb-nav lb-prev" aria-label="รูปก่อนหน้า">‹</button>
      <button class="lb-nav lb-next" aria-label="รูปถัดไป">›</button>
      <div class="lb-count" id="lbCount">${i + 1} / ${list.length}</div>` : ''}`;
  document.body.append(lb);

  const show = n => {
    i = (n + list.length) % list.length;
    lb.querySelector('#lbImg').src = list[i];
    const c = lb.querySelector('#lbCount');
    if (c) c.textContent = `${i + 1} / ${list.length}`;
  };
  const close = () => { lb.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(i - 1);
    else if (e.key === 'ArrowRight') show(i + 1);
  };

  lb.addEventListener('click', e => {
    if (e.target.closest('.lb-prev')) { e.stopPropagation(); show(i - 1); }
    else if (e.target.closest('.lb-next')) { e.stopPropagation(); show(i + 1); }
    else close();
  });
  document.addEventListener('keydown', onKey);
}

/* ---------- Modal ---------- */

let closeModal = null;

function openModal(html, wire) {
  closeModal?.();
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  $('modalRoot').append(ov);
  document.body.style.overflow = 'hidden';

  const close = () => {
    ov.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    closeModal = null;
  };
  // ไม่ปิด modal ด้วย Escape ถ้ามีภาพเต็มจอ (lightbox) เปิดอยู่ — ให้ Escape ปิดภาพก่อน
  const onKey = e => {
    if (e.key === 'Escape' && !document.querySelector('.lightbox')) close();
  };

  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  document.addEventListener('keydown', onKey);
  closeModal = close;
  wire?.(ov, close);
  return close;
}

/* ---------- แถบดาวเคราะห์ ---------- */

function renderPlanets(planets, now) {
  const strip = $('planetStrip');
  if (!strip) return;
  strip.innerHTML = planets.map(p => `
    <div class="planet-chip" title="${esc(p.name)} อยู่ราศี${esc(p.rasi.name)} ${p.rasi.deg.toFixed(1)}°">
      <span class="planet-dot" style="color:${p.color}"></span>
      <b>${esc(p.name)}</b><span>${esc(p.rasi.name)}</span>
    </div>`).join('');

  const clock = $('skyClock');
  if (clock) {
    clock.textContent = 'ท้องฟ้าจำลอง · ' +
      now.toLocaleString('th-TH', { dateStyle:'medium', timeStyle:'short' });
  }
}

/* ---------- สร้างต้นไม้ ---------- */

const bySort = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);

/**
 * จัดข้อมูลเป็นชั้น: บริษัท → แผนก → พนักงาน
 * พนักงานที่มีแผนก จะอยู่ตามบริษัทของแผนกนั้น
 * พนักงานที่ไม่มีแผนก (เช่น CEO) จะอยู่กลุ่ม "ผู้บริหาร" ของบริษัทตัวเอง
 */
function buildStructure() {
  const { companies, departments, employees } = Store.all();
  const deptById = new Map(departments.map(d => [d.id, d]));

  // แยกพนักงานลงถัง key = "companyId|departmentId"
  const bucket = new Map();
  const put = (cid, did, emp) => {
    const k = `${cid || ''}|${did || ''}`;
    if (!bucket.has(k)) bucket.set(k, []);
    bucket.get(k).push(emp);
  };
  employees.forEach(e => {
    const d = e.departmentId ? deptById.get(e.departmentId) : null;
    if (d) put(d.companyId, d.id, e);
    else put(e.companyId, null, e);
  });

  const makeBlock = comp => {
    const cid = comp ? comp.id : null;
    const groups = [];

    const execs = bucket.get(`${cid || ''}|`) || [];
    if (execs.length) groups.push({ id: null, name: 'ผู้บริหาร', members: execs });

    departments
      .filter(d => (d.companyId || null) === cid)
      .sort(bySort)
      .forEach(d => groups.push({ ...d, members: bucket.get(`${cid || ''}|${d.id}`) || [] }));

    return { id: cid, name: comp ? comp.name : 'ยังไม่ระบุบริษัท', groups };
  };

  const blocks = companies.slice().sort(bySort).map(makeBlock);
  const orphan = makeBlock(null);
  if (orphan.groups.length) blocks.push(orphan);
  return blocks;
}

/** แปลงรายชื่อในกลุ่มเป็นต้นไม้ */
function toTree(members) {
  const ids = new Set(members.map(m => m.id));
  const childrenOf = new Map();
  const roots = [];
  members.forEach(m => {
    const isRoot = !m.managerId || !ids.has(m.managerId);
    if (isRoot) roots.push(m);
    else {
      if (!childrenOf.has(m.managerId)) childrenOf.set(m.managerId, []);
      childrenOf.get(m.managerId).push(m);
    }
  });
  const sort = a => a.sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0));
  const attach = node => ({
    ...node,
    children: sort(childrenOf.get(node.id) || []).map(attach)
  });
  return sort(roots).map(attach);
}

function chartsOf(emp) {
  if (Array.isArray(emp.chartUrls) && emp.chartUrls.length) return emp.chartUrls;
  return emp.chartUrl ? [emp.chartUrl] : [];
}

function nodeHTML(n, depth) {
  const dept = Store.all().departments.find(d => d.id === n.departmentId);
  const nCharts = chartsOf(n).length;
  return `
    <li>
      <div class="node ${depth === 0 ? 'is-lead' : ''}"
           data-id="${esc(n.id)}" draggable="true"
           tabindex="0" role="button"
           style="animation-delay:${Math.min(depth * 70, 350)}ms">
        ${nCharts ? `<span class="node-flag" title="มีรูปดวง ${nCharts} รูป">✦${nCharts > 1 ? nCharts : ''}</span>` : ''}
        <div class="node-avatar">${esc(initial(n.nickname))}</div>
        <div class="node-name">${esc(n.nickname || 'ไม่มีชื่อ')}</div>
        <div class="node-role">${esc(n.position || '—')}</div>
        ${dept ? `<span class="node-dept">${esc(dept.name)}</span>` : ''}
      </div>
      ${n.children.length
        ? `<ul>${n.children.map(c => nodeHTML(c, depth + 1)).join('')}</ul>`
        : ''}
    </li>`;
}

function render() {
  const stage = $('stage');
  const blocks = buildStructure();
  const { companies, departments, employees } = Store.all();

  if (!employees.length && !departments.length && !companies.length) {
    stage.innerHTML = `
      <div class="empty">
        <h3>ยังไม่มีข้อมูล</h3>
        <p>เริ่มจากสร้างบริษัทก่อน แล้วค่อยเพิ่มผู้บริหาร แผนก และพนักงานตามลงมา</p>
        <div class="add-zone">
          <button class="btn btn-gold" id="emptyCompany">+ เพิ่มบริษัท</button>
          <button class="btn" id="emptyCeo">+ เพิ่ม CEO</button>
        </div>
      </div>`;
    $('emptyCompany')?.addEventListener('click', () => companyForm());
    $('emptyCeo')?.addEventListener('click', () => personForm(null, { position: 'CEO' }));
    return;
  }

  let delay = 0;

  const groupHTML = g => {
    const tree = toTree(g.members);
    delay += 90;
    return `
      <section class="dept" style="animation-delay:${delay}ms">
        <div class="dept-head">
          <div class="dept-title">${esc(g.name)}</div>
          <span class="dept-count">${g.members.length} คน</span>
          <div class="dept-actions">
            ${g.id ? `
              <button class="btn btn-sm btn-ghost" data-edit-dept="${esc(g.id)}">แก้ชื่อ</button>
              <button class="btn btn-sm btn-danger" data-del-dept="${esc(g.id)}">ลบแผนก</button>
            ` : ''}
          </div>
        </div>
        ${tree.length
          ? `<ul class="tree">${tree.map(n => nodeHTML(n, 0)).join('')}</ul>`
          : `<div class="empty" style="padding:22px">
               <p style="margin:0">ยังไม่มีพนักงานในแผนกนี้</p>
             </div>`}
      </section>`;
  };

  stage.innerHTML = blocks.map(b => {
    const headcount = b.groups.reduce((n, g) => n + g.members.length, 0);
    return `
      <section class="company">
        <div class="company-head">
          <div class="company-mark">🏢</div>
          <div class="company-title">${esc(b.name)}</div>
          <span class="company-count">${headcount} คน</span>
          <div class="company-actions">
            ${b.id ? `
              <button class="btn btn-sm btn-ghost" data-add-dept="${esc(b.id)}">+ แผนก</button>
              <button class="btn btn-sm btn-ghost" data-edit-co="${esc(b.id)}">แก้ชื่อ</button>
              <button class="btn btn-sm btn-danger" data-del-co="${esc(b.id)}">ลบบริษัท</button>
            ` : ''}
          </div>
        </div>
        ${b.groups.length
          ? b.groups.map(groupHTML).join('')
          : `<div class="empty" style="padding:26px">
               <p style="margin:0">บริษัทนี้ยังไม่มีแผนกหรือพนักงาน</p>
             </div>`}
      </section>`;
  }).join('');

  wireNodes();
}

/* ---------- เชื่อมเหตุการณ์กับการ์ด ---------- */

function wireNodes() {
  document.querySelectorAll('.node').forEach(el => {
    const id = el.dataset.id;

    el.addEventListener('click', () => detailView(id));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); detailView(id); }
    });

    // ---- ลากวาง (คอมพิวเตอร์) ----
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      document.querySelectorAll('.drop-target')
        .forEach(n => n.classList.remove('drop-target'));
    });
    el.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      el.classList.add('drop-target');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
    el.addEventListener('drop', async e => {
      e.preventDefault();
      el.classList.remove('drop-target');
      const dragId = e.dataTransfer.getData('text/plain');
      if (dragId && dragId !== id) await reparent(dragId, id);
    });
  });

  document.querySelectorAll('[data-add-dept]').forEach(b =>
    b.addEventListener('click', e => {
      e.stopPropagation();
      deptForm(null, { companyId: b.dataset.addDept });
    }));

  document.querySelectorAll('[data-edit-co]').forEach(b =>
    b.addEventListener('click', e => {
      e.stopPropagation();
      const c = Store.all().companies.find(x => x.id === b.dataset.editCo);
      if (c) companyForm(c);
    }));

  document.querySelectorAll('[data-del-co]').forEach(b =>
    b.addEventListener('click', async e => {
      e.stopPropagation();
      const c = Store.all().companies.find(x => x.id === b.dataset.delCo);
      if (!c) return;
      if (!confirm(`ลบบริษัท "${c.name}"?\n\nแผนกและพนักงานจะไม่ถูกลบ แต่จะย้ายไปกลุ่ม "ยังไม่ระบุบริษัท"`)) return;
      await Store.deleteCompany(c.id);
      render();
      toast('ลบบริษัทแล้ว', 'ok');
    }));

  document.querySelectorAll('[data-edit-dept]').forEach(b =>
    b.addEventListener('click', e => {
      e.stopPropagation();
      const d = Store.all().departments.find(x => x.id === b.dataset.editDept);
      if (d) deptForm(d);
    }));

  document.querySelectorAll('[data-del-dept]').forEach(b =>
    b.addEventListener('click', async e => {
      e.stopPropagation();
      const d = Store.all().departments.find(x => x.id === b.dataset.delDept);
      if (!d) return;
      if (!confirm(`ลบแผนก "${d.name}"?\n\nพนักงานในแผนกนี้จะไม่ถูกลบ แต่จะย้ายไปอยู่กลุ่ม "ยังไม่ระบุแผนก"`)) return;
      await Store.deleteDepartment(d.id);
      render();
      toast('ลบแผนกแล้ว', 'ok');
    }));
}

/** ย้ายคนไปอยู่ใต้หัวหน้าคนใหม่ (กันวนลูป) */
async function reparent(dragId, newManagerId) {
  const emps = Store.all().employees;
  const drag = emps.find(e => e.id === dragId);
  const target = emps.find(e => e.id === newManagerId);
  if (!drag || !target) return;

  // กันการลากหัวหน้าไปไว้ใต้ลูกน้องตัวเอง (จะทำให้ผังวนลูป)
  let cur = target;
  const seen = new Set();
  while (cur && !seen.has(cur.id)) {
    if (cur.id === dragId) {
      toast('ย้ายไม่ได้ — จะทำให้ผังวนกลับมาหาตัวเอง', 'err');
      return;
    }
    seen.add(cur.id);
    cur = emps.find(e => e.id === cur.managerId);
  }

  drag.managerId = newManagerId;
  drag.departmentId = target.departmentId;   // ย้ายตามแผนกและบริษัทของหัวหน้าใหม่
  drag.companyId = target.companyId || null;
  await Store.saveEmployee(drag);
  render();
  toast(`ย้าย ${drag.nickname} ไปอยู่ใต้ ${target.nickname} แล้ว`, 'ok');
}

/* ---------- หน้ารายละเอียดพนักงาน ---------- */

function detailView(id) {
  const emp = Store.all().employees.find(e => e.id === id);
  if (!emp) return;
  const dept = Store.all().departments.find(d => d.id === emp.departmentId);
  const mgr  = Store.all().employees.find(e => e.id === emp.managerId);
  const comp = Store.all().companies.find(c =>
    c.id === (dept ? dept.companyId : emp.companyId));
  const charts = chartsOf(emp);

  const row = (label, value) => `
    <div class="field-row">
      <span class="field-label">${label}</span>
      <span class="field-value ${value ? '' : 'empty-val'}">${value ? esc(value) : 'ยังไม่ได้กรอก'}</span>
    </div>`;

  let computed = '';
  if (CFG.showComputedAstrology && emp.birthDate) {
    const p = Astro.birthProfile(emp.birthDate);
    if (p) {
      computed = `
        <div class="section-title">คำนวณอัตโนมัติ</div>
        ${row('วันเกิด', 'วัน' + p.weekday)}
        ${row('ปีนักษัตร', 'ปี' + p.animal)}
        ${row('ราศี', p.rasi)}
        ${row('ธาตุ', p.element)}
        ${row('สีมงคล / สีกาลกิณี', `${p.luckyColor} / ${p.unluckyColor}`)}
        ${row('อายุ', p.age + ' ปี')}`;
    }
  }

  openModal(`
    <div class="sheet-head">
      <div class="sheet-avatar">${esc(initial(emp.nickname))}</div>
      <div class="sheet-name">${esc(emp.nickname || 'ไม่มีชื่อ')}</div>
      <div class="sheet-role">${esc(emp.position || '—')}${dept ? ' · ' + esc(dept.name) : ''}</div>
    </div>

    <div class="tabs" role="tablist">
      <button class="tab is-active" data-tab="info" role="tab">ข้อมูล</button>
      <button class="tab" data-tab="chart" role="tab">รูปดวง</button>
      <button class="tab" data-tab="predict" role="tab">คำทำนาย</button>
    </div>

    <div class="sheet-body">
      <!-- แท็บข้อมูล -->
      <div class="tab-panel is-active" data-panel="info">
        <div class="section-title">ข้อมูลทั่วไป</div>
        ${row('ชื่อเล่น', emp.nickname)}
        ${row('ตำแหน่ง', emp.position)}
        ${row('บริษัท', comp?.name)}
        ${row('แผนก', dept?.name)}
        ${row('หัวหน้า', mgr?.nickname)}

        <div class="section-title">ข้อมูลโหราศาสตร์</div>
        ${row('วัน/เดือน/ปีเกิด', thaiDate(emp.birthDate))}
        ${row('เวลาเกิด', thaiTime(emp.birthTime))}
        ${row('จังหวัดที่เกิด', emp.birthProvince)}
        ${computed}
      </div>

      <!-- แท็บรูปดวง (ดูอย่างเดียว) -->
      <div class="tab-panel" data-panel="chart">
        ${charts.length
          ? `<div class="chart-gallery">
               ${charts.map((u, i) => `
                 <button class="chart-cell" data-view="${i}" aria-label="ดูรูปที่ ${i + 1}">
                   <img src="${esc(u)}" alt="รูปดวงที่ ${i + 1}" loading="lazy">
                   <span class="chart-cell-zoom">🔍</span>
                 </button>`).join('')}
             </div>
             <div class="chart-count">${charts.length} รูป · กดที่รูปเพื่อดูเต็มจอ</div>`
          : `<div class="chart-empty">
               <div class="chart-empty-icon">✦</div>
               <p>ยังไม่มีรูปดวง</p>
               <small>เพิ่มรูปได้ที่ปุ่ม “แก้ไขข้อมูล”</small>
             </div>`}
      </div>

      <!-- แท็บคำทำนาย (แก้ไข + บันทึกได้) -->
      <div class="tab-panel" data-panel="predict">
        <label class="lbl" for="f-predict">บันทึกคำทำนาย / คำแนะนำ</label>
        <textarea id="f-predict" rows="9" placeholder="พิมพ์คำทำนาย ดวงชะตา หรือคำแนะนำสำหรับพนักงานคนนี้…">${esc(emp.prediction || '')}</textarea>
        <div class="predict-foot">
          <span class="predict-hint" id="predictHint"></span>
          <button class="btn btn-gold btn-sm" id="btnSavePredict">บันทึกคำทำนาย</button>
        </div>
      </div>
    </div>

    <div class="sheet-foot">
      <button class="btn btn-danger btn-sm" id="btnDel">ลบพนักงาน</button>
      <div class="spacer"></div>
      <button class="btn btn-gold" id="btnEdit">แก้ไขข้อมูล</button>
    </div>
  `, (ov, close) => {

    // ---- สลับแท็บ ----
    ov.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        ov.querySelectorAll('.tab').forEach(t => t.classList.remove('is-active'));
        ov.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('is-active'));
        tab.classList.add('is-active');
        ov.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add('is-active');
      });
    });

    // ---- ดูรูปเต็มจอ (เลื่อนซ้าย-ขวาได้ถ้ามีหลายรูป) ----
    ov.querySelectorAll('.chart-cell').forEach(cell =>
      cell.addEventListener('click', () => openLightbox(charts, +cell.dataset.view)));

    // ---- บันทึกคำทำนาย ----
    ov.querySelector('#btnSavePredict')?.addEventListener('click', async () => {
      const val = ov.querySelector('#f-predict').value.trim();
      const hint = ov.querySelector('#predictHint');
      try {
        emp.prediction = val;
        await Store.saveEmployee(emp);
        hint.textContent = 'บันทึกแล้ว ✓';
        hint.className = 'predict-hint ok';
        render();
        toast('บันทึกคำทำนายแล้ว', 'ok');
      } catch (err) {
        hint.textContent = '';
        toast(err.message || 'บันทึกไม่สำเร็จ', 'err');
      }
    });

    ov.querySelector('#btnEdit').addEventListener('click', () => { close(); personForm(emp); });

    ov.querySelector('#btnDel').addEventListener('click', async () => {
      if (!confirm(`ลบ "${emp.nickname}" ออกจากผัง?\n\nลูกน้อง (ถ้ามี) จะเลื่อนขึ้นไปอยู่ใต้หัวหน้าคนถัดไป`)) return;
      await Store.deleteEmployee(emp.id);
      close(); render();
      toast('ลบพนักงานแล้ว', 'ok');
    });
  });
}

/* ---------- ฟอร์มพนักงาน ---------- */

function personForm(emp = null, preset = {}) {
  const { departments, employees } = Store.all();
  const isNew = !emp;
  const e = emp || { nickname:'', position:'', departmentId:null, managerId:null,
                     birthDate:'', birthTime:'', birthProvince:'', ...preset };

  // ตัวเลือกหัวหน้า — ตัดตัวเองและลูกน้องตัวเองออก (กันวนลูป)
  const banned = new Set();
  if (emp) {
    const walk = pid => employees.filter(x => x.managerId === pid)
      .forEach(c => { banned.add(c.id); walk(c.id); });
    banned.add(emp.id); walk(emp.id);
  }

  const companies = Store.all().companies;

  // บริษัทของพนักงาน: ถ้ามีแผนก ให้ยึดตามบริษัทของแผนกนั้น
  const ownDept = e.departmentId ? departments.find(d => d.id === e.departmentId) : null;
  const curCompany = ownDept ? (ownDept.companyId || '') : (e.companyId || '');

  const coOpts = ['<option value="">— ยังไม่ระบุบริษัท —</option>']
    .concat(companies.map(c =>
      `<option value="${esc(c.id)}" ${c.id === curCompany ? 'selected' : ''}>${esc(c.name)}</option>`))
    .join('');

  /** แผนกที่เลือกได้ ขึ้นกับบริษัทที่เลือกอยู่ */
  const deptOptsFor = (cid, selected) =>
    ['<option value="">— ไม่ระบุแผนก (ระดับบริหาร) —</option>']
      .concat(departments
        .filter(d => (d.companyId || '') === (cid || ''))
        .sort(bySort)
        .map(d => `<option value="${esc(d.id)}" ${d.id === selected ? 'selected' : ''}>${esc(d.name)}</option>`))
      .join('');

  const deptOpts = deptOptsFor(curCompany, e.departmentId);

  const mgrOpts = ['<option value="">— ไม่มี (อยู่บนสุด) —</option>']
    .concat(employees.filter(x => !banned.has(x.id)).map(x =>
      `<option value="${esc(x.id)}" ${x.id === e.managerId ? 'selected' : ''}>${esc(x.nickname)}${x.position ? ' · ' + esc(x.position) : ''}</option>`))
    .join('');

  const provOpts = ['<option value="">— เลือกจังหวัด —</option>']
    .concat(PROVINCES.map(p =>
      `<option value="${esc(p)}" ${p === e.birthProvince ? 'selected' : ''}>${esc(p)}</option>`))
    .join('');

  openModal(`
    <div class="sheet-head">
      <div class="sheet-name">${isNew ? 'เพิ่มพนักงาน' : 'แก้ไขข้อมูล'}</div>
      <div class="sheet-role">${isNew ? 'กรอกข้อมูลพนักงานใหม่' : esc(e.nickname)}</div>
    </div>

    <form id="pf">
      <div class="sheet-body">
        <div class="section-title">ข้อมูลทั่วไป</div>
        <div class="form-grid">
          <div>
            <label class="lbl" for="f-nick">ชื่อเล่น *</label>
            <input type="text" id="f-nick" value="${esc(e.nickname)}" required maxlength="40" placeholder="เช่น ต้น">
          </div>
          <div>
            <label class="lbl" for="f-pos">ตำแหน่ง</label>
            <input type="text" id="f-pos" value="${esc(e.position)}" maxlength="80" placeholder="เช่น ผู้จัดการฝ่ายขาย">
          </div>
          <div>
            <label class="lbl" for="f-co">บริษัท</label>
            <select id="f-co">${coOpts}</select>
          </div>
          <div class="form-2">
            <div>
              <label class="lbl" for="f-dept">แผนก</label>
              <select id="f-dept">${deptOpts}</select>
            </div>
            <div>
              <label class="lbl" for="f-mgr">หัวหน้า</label>
              <select id="f-mgr">${mgrOpts}</select>
            </div>
          </div>
        </div>

        <div class="section-title">ข้อมูลโหราศาสตร์</div>
        <div class="form-grid">
          <div>
            <label class="lbl">วัน/เดือน/ปีเกิด</label>
            ${dateSelects(e.birthDate)}
          </div>
          <div>
            <label class="lbl">เวลาเกิด</label>
            ${timeSelects(e.birthTime)}
          </div>
          <div>
            <label class="lbl" for="f-prov">จังหวัดที่เกิด</label>
            <select id="f-prov">${provOpts}</select>
          </div>
        </div>

        <div class="section-title">รูปดวง</div>
        <div class="chart-edit">
          <div class="chart-thumbs" id="chartThumbs"></div>
          <div class="chart-drop" id="chartDrop">
            เพิ่มรูปดวง<br>
            <small>กดที่นี่เพื่อเลือกไฟล์ (เลือกได้หลายรูป) หรือลากรูปมาวาง</small>
          </div>
          <input type="file" id="chartFile" accept="image/*" multiple hidden>
        </div>
      </div>

      <div class="sheet-foot">
        <button type="button" class="btn btn-ghost" id="btnCancel">ยกเลิก</button>
        <div class="spacer"></div>
        <button type="submit" class="btn btn-gold">${isNew ? 'เพิ่มพนักงาน' : 'บันทึก'}</button>
      </div>
    </form>
  `, (ov, close) => {
    ov.querySelector('#btnCancel').addEventListener('click', close);

    // ---- จัดการรูปดวงหลายรูป (แต่ละชิ้นเป็น url เดิม หรือ file ที่รออัปโหลด) ----
    const items = chartsOf(e).map(url => ({ url }));   // [{url} | {file, preview}]
    const fileInput = ov.querySelector('#chartFile');
    const drop = ov.querySelector('#chartDrop');
    const thumbs = ov.querySelector('#chartThumbs');

    const renderThumbs = () => {
      thumbs.innerHTML = items.map((it, i) => `
        <div class="chart-thumb-item">
          <img src="${esc(it.url || it.preview)}" alt="รูปดวงที่ ${i + 1}">
          <button type="button" class="chart-thumb-del" data-del="${i}" aria-label="ลบรูปนี้">✕</button>
        </div>`).join('');
      thumbs.querySelectorAll('[data-del]').forEach(btn =>
        btn.addEventListener('click', () => {
          const it = items[+btn.dataset.del];
          if (it.preview) URL.revokeObjectURL(it.preview);
          items.splice(+btn.dataset.del, 1);
          renderThumbs();
        }));
    };

    const takeFiles = files => {
      const imgs = [...files].filter(f => f.type.startsWith('image/'));
      if (!imgs.length) return toast('กรุณาเลือกไฟล์รูปภาพ', 'err');
      imgs.forEach(f => items.push({ file: f, preview: URL.createObjectURL(f) }));
      renderThumbs();
    };

    drop.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => { takeFiles(fileInput.files); fileInput.value = ''; });
    ['dragenter','dragover'].forEach(ev =>
      drop.addEventListener(ev, e2 => { e2.preventDefault(); drop.classList.add('over'); }));
    ['dragleave','drop'].forEach(ev =>
      drop.addEventListener(ev, e2 => { e2.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e2 => takeFiles(e2.dataTransfer.files));

    renderThumbs();

    // เดือน/ปีเปลี่ยน → ปรับจำนวนวันให้ตรงกับเดือนนั้น
    ov.querySelector('#f-bmonth').addEventListener('change', () => syncDayOptions(ov));
    ov.querySelector('#f-byear').addEventListener('change', () => syncDayOptions(ov));
    syncDayOptions(ov);

    // เปลี่ยนบริษัท → แผนกที่เลือกได้เปลี่ยนตาม
    ov.querySelector('#f-co').addEventListener('change', ev2 => {
      ov.querySelector('#f-dept').innerHTML = deptOptsFor(ev2.target.value, null);
    });

    ov.querySelector('#pf').addEventListener('submit', async ev => {
      ev.preventDefault();
      const nick = ov.querySelector('#f-nick').value.trim();
      if (!nick) return toast('กรุณากรอกชื่อเล่น', 'err');

      const birthDate = readDate(ov);
      if (birthDate === undefined) return toast('กรุณาเลือกวัน เดือน และปีเกิดให้ครบ', 'err');
      const birthTime = readTime(ov);
      if (birthTime === undefined) return toast('กรุณาเลือกทั้งชั่วโมงและนาที', 'err');

      const deptId = ov.querySelector('#f-dept').value || null;
      const pickedCo = ov.querySelector('#f-co').value || null;
      // ถ้าเลือกแผนก ให้บริษัทยึดตามแผนกเสมอ กันข้อมูลขัดกันเอง
      const ofDept = deptId ? departments.find(d => d.id === deptId) : null;

      const saveBtn = ov.querySelector('#pf button[type=submit]');
      saveBtn.disabled = true;

      try {
        // อัปโหลดรูปใหม่ที่รออยู่ (ถ้ามี) แล้วเรียงรูปตามลำดับเดิม
        if (!e.id) e.id = (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now());
        const pendingCount = items.filter(it => it.file).length;
        let done = 0;
        const chartUrls = [];
        for (const it of items) {
          if (it.url) { chartUrls.push(it.url); continue; }
          done++;
          saveBtn.textContent = `กำลังอัปโหลดรูป ${done}/${pendingCount}…`;
          chartUrls.push(await Store.uploadChart(it.file, e.id, done + '-'));
        }

        const data = {
          ...e,
          nickname: nick,
          position: ov.querySelector('#f-pos').value.trim(),
          companyId: ofDept ? (ofDept.companyId || null) : pickedCo,
          departmentId: deptId,
          managerId: ov.querySelector('#f-mgr').value || null,
          birthDate,
          birthTime,
          birthProvince: ov.querySelector('#f-prov').value || null,
          chartUrls
        };

        await Store.saveEmployee(data);
        close(); render();
        toast(isNew ? 'เพิ่มพนักงานแล้ว' : 'บันทึกแล้ว', 'ok');
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = isNew ? 'เพิ่มพนักงาน' : 'บันทึก';
        toast(err.message || 'บันทึกไม่สำเร็จ', 'err');
      }
    });
  });
}

/* ---------- ฟอร์มแผนก ---------- */

function deptForm(dept = null, preset = {}) {
  const isNew = !dept;
  const d = dept || { name: '', companyId: null, ...preset };
  const companies = Store.all().companies;

  const coOpts = ['<option value="">— ยังไม่ระบุบริษัท —</option>']
    .concat(companies.map(c =>
      `<option value="${esc(c.id)}" ${c.id === d.companyId ? 'selected' : ''}>${esc(c.name)}</option>`))
    .join('');

  openModal(`
    <div class="sheet-head">
      <div class="sheet-name">${isNew ? 'เพิ่มแผนก' : 'แก้ไขแผนก'}</div>
    </div>
    <form id="df">
      <div class="sheet-body">
        <div class="form-grid">
          <div>
            <label class="lbl" for="f-dname">ชื่อแผนก *</label>
            <input type="text" id="f-dname" value="${esc(d.name)}"
                   required maxlength="60" placeholder="เช่น ฝ่ายขาย" autofocus>
          </div>
          <div>
            <label class="lbl" for="f-dco">อยู่ในบริษัท</label>
            <select id="f-dco">${coOpts}</select>
          </div>
        </div>
      </div>
      <div class="sheet-foot">
        <button type="button" class="btn btn-ghost" id="btnCancel">ยกเลิก</button>
        <div class="spacer"></div>
        <button type="submit" class="btn btn-gold">${isNew ? 'เพิ่ม' : 'บันทึก'}</button>
      </div>
    </form>
  `, (ov, close) => {
    ov.querySelector('#btnCancel').addEventListener('click', close);
    ov.querySelector('#df').addEventListener('submit', async ev => {
      ev.preventDefault();
      const name = ov.querySelector('#f-dname').value.trim();
      if (!name) return toast('กรุณากรอกชื่อแผนก', 'err');
      const companyId = ov.querySelector('#f-dco').value || null;
      try {
        await Store.saveDepartment({ ...d, name, companyId });
        close(); render();
        toast(isNew ? 'เพิ่มแผนกแล้ว' : 'บันทึกแล้ว', 'ok');
      } catch (err) {
        toast(err.message || 'บันทึกไม่สำเร็จ', 'err');
      }
    });
  });
}

/* ---------- ฟอร์มบริษัท ---------- */

function companyForm(company = null) {
  const isNew = !company;
  openModal(`
    <div class="sheet-head">
      <div class="sheet-name">${isNew ? 'เพิ่มบริษัท' : 'แก้ชื่อบริษัท'}</div>
      <div class="sheet-role">โครงสร้าง: บริษัท → แผนก → พนักงาน</div>
    </div>
    <form id="cf">
      <div class="sheet-body">
        <label class="lbl" for="f-cname">ชื่อบริษัท *</label>
        <input type="text" id="f-cname" value="${esc(company?.name || '')}"
               required maxlength="80" placeholder="เช่น อินฟินิท บิลเดอร์ส" autofocus>
      </div>
      <div class="sheet-foot">
        <button type="button" class="btn btn-ghost" id="btnCancel">ยกเลิก</button>
        <div class="spacer"></div>
        <button type="submit" class="btn btn-gold">${isNew ? 'เพิ่ม' : 'บันทึก'}</button>
      </div>
    </form>
  `, (ov, close) => {
    ov.querySelector('#btnCancel').addEventListener('click', close);
    ov.querySelector('#cf').addEventListener('submit', async ev => {
      ev.preventDefault();
      const name = ov.querySelector('#f-cname').value.trim();
      if (!name) return toast('กรุณากรอกชื่อบริษัท', 'err');
      try {
        await Store.saveCompany(company ? { ...company, name } : { name });
        close(); render();
        toast(isNew ? 'เพิ่มบริษัทแล้ว' : 'บันทึกแล้ว', 'ok');
      } catch (err) {
        toast(err.message || 'บันทึกไม่สำเร็จ', 'err');
      }
    });
  });
}

/* ---------- เมนู ---------- */

function menuView() {
  const mode = Store.getMode();
  openModal(`
    <div class="sheet-head">
      <div class="sheet-name">เมนู</div>
      <div class="sheet-role">${mode === 'cloud' ? 'เชื่อมต่อ Supabase อยู่' : 'โหมดเก็บในเครื่องนี้'}</div>
    </div>
    <div class="sheet-body">
      <div class="section-title">ข้อมูล</div>
      <div class="form-grid">
        <button class="btn" id="btnExport">⬇ ส่งออกข้อมูล (.json)</button>
        <button class="btn" id="btnImport">⬆ นำเข้าข้อมูล (.json)</button>
        <input type="file" id="importFile" accept="application/json" hidden>
      </div>
      ${mode === 'local' ? `
        <div class="section-title">หมายเหตุ</div>
        <p style="font-size:13px;color:var(--muted);line-height:1.65">
          ตอนนี้ข้อมูลเก็บอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น
          เปิดจากเครื่องอื่นจะไม่เห็นข้อมูล และถ้าล้างข้อมูลเบราว์เซอร์ข้อมูลจะหาย<br><br>
          แนะนำให้กด <b>ส่งออกข้อมูล</b> เก็บไฟล์สำรองไว้เป็นระยะ
        </p>` : ''}
    </div>
    <div class="sheet-foot">
      <button class="btn btn-danger btn-sm" id="btnLogout">ออกจากระบบ</button>
      <div class="spacer"></div>
      <button class="btn btn-ghost" id="btnClose">ปิด</button>
    </div>
  `, (ov, close) => {
    ov.querySelector('#btnClose').addEventListener('click', close);

    ov.querySelector('#btnExport').addEventListener('click', () => {
      const blob = new Blob([Store.exportJSON()], { type:'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `hora-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast('ส่งออกข้อมูลแล้ว', 'ok');
    });

    const imp = ov.querySelector('#importFile');
    ov.querySelector('#btnImport').addEventListener('click', () => imp.click());
    imp.addEventListener('change', async () => {
      const f = imp.files[0];
      if (!f) return;
      if (!confirm('นำเข้าข้อมูลจะเขียนทับข้อมูลปัจจุบันทั้งหมด ต้องการทำต่อ?')) return;
      try {
        await Store.importJSON(await f.text());
        close(); render();
        toast('นำเข้าข้อมูลแล้ว', 'ok');
      } catch (err) {
        toast(err.message || 'ไฟล์ไม่ถูกต้อง', 'err');
      }
    });

    ov.querySelector('#btnLogout').addEventListener('click', () => {
      sessionStorage.removeItem('hora.auth');
      location.reload();
    });
  });
}

/* ---------- เริ่มระบบ ---------- */

async function boot() {
  $('app').hidden = false;
  $('statusbar').hidden = false;
  document.body.classList.remove('locked');

  $('companyName').textContent = CFG.companyName;
  $('companyTagline').textContent = CFG.companyTagline;
  document.title = `${CFG.companyName} · ผังองค์กร`;

  try {
    const mode = await Store.init(CFG);
    $('statusDot').className = 'status-dot' + (mode === 'local' ? ' local' : '');
    $('statusText').textContent = mode === 'cloud'
      ? 'เชื่อมต่อ Supabase — ข้อมูลซิงก์ทุกเครื่อง'
      : 'โหมดเก็บในเครื่อง — ยังไม่ได้ตั้งค่า Supabase';
  } catch (e) {
    $('statusDot').className = 'status-dot local';
    $('statusText').textContent = 'โหลดข้อมูลไม่สำเร็จ: ' + e.message;
    toast('โหลดข้อมูลไม่สำเร็จ', 'err');
  }

  render();

  $('btnAddCompany').addEventListener('click', () => companyForm());
  $('btnAddPerson').addEventListener('click', () => personForm());
  $('btnAddDept').addEventListener('click', () => deptForm());
  $('btnMenu').addEventListener('click', menuView);
}

/* ---------- ประตูรหัสผ่าน ---------- */

function initGate() {
  const gate = $('gate');
  $('gateTitle').textContent = CFG.companyName || 'HORA';

  const enter = () => {
    sessionStorage.setItem('hora.auth', '1');
    gate.style.transition = 'opacity .55s, transform .55s';
    gate.style.opacity = '0';
    gate.style.transform = 'scale(1.06)';
    setTimeout(() => { gate.remove(); boot(); }, 520);
  };

  if (sessionStorage.getItem('hora.auth') === '1') {
    gate.remove();
    boot();
    return;
  }

  $('gateForm').addEventListener('submit', ev => {
    ev.preventDefault();
    const val = $('gatePass').value;
    if (val === CFG.password) {
      $('gateErr').textContent = '';
      enter();
    } else {
      $('gateErr').textContent = 'รหัสผ่านไม่ถูกต้อง';
      $('gatePass').value = '';
      $('gatePass').focus();
      const card = document.querySelector('.gate-card');
      card.style.animation = 'none';
      requestAnimationFrame(() => { card.style.animation = 'shake .4s'; });
    }
  });
}

/* ---------- ออกตัว ---------- */

window.addEventListener('DOMContentLoaded', () => {
  document.title = `${CFG.companyName} · ผังองค์กร`;
  Wheel.init();
  Sky.init($('sky'), CFG, renderPlanets);
  initGate();
});

})();
