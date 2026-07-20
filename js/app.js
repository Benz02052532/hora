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
  const onKey = e => { if (e.key === 'Escape') close(); };

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

/** จัดกลุ่มพนักงานเป็นแผนก แล้วสร้างโครงต้นไม้จาก managerId */
function buildGroups() {
  const { departments, employees } = Store.all();
  const byDept = new Map();
  byDept.set(null, []);
  departments.forEach(d => byDept.set(d.id, []));
  employees.forEach(e => {
    const key = byDept.has(e.departmentId) ? e.departmentId : null;
    byDept.get(key).push(e);
  });

  const groups = [];
  const noDept = byDept.get(null);
  if (noDept.length) {
    groups.push({ id:null, name:'ผู้บริหาร / ยังไม่ระบุแผนก', members:noDept });
  }
  departments
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .forEach(d => groups.push({ ...d, members: byDept.get(d.id) || [] }));
  return groups;
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

function nodeHTML(n, depth) {
  const dept = Store.all().departments.find(d => d.id === n.departmentId);
  const hasChart = !!n.chartUrl;
  return `
    <li>
      <div class="node ${depth === 0 ? 'is-lead' : ''}"
           data-id="${esc(n.id)}" draggable="true"
           tabindex="0" role="button"
           style="animation-delay:${Math.min(depth * 70, 350)}ms">
        ${hasChart ? '<span class="node-flag" title="มีรูปดวง">✦</span>' : ''}
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
  const groups = buildGroups();
  const total = Store.all().employees.length;

  if (!total && !Store.all().departments.length) {
    stage.innerHTML = `
      <div class="empty">
        <h3>ยังไม่มีข้อมูล</h3>
        <p>เริ่มต้นด้วยการเพิ่มแผนก แล้วค่อยเพิ่มพนักงาน</p>
        <button class="btn btn-gold" id="emptyAdd">+ เพิ่มแผนกแรก</button>
      </div>`;
    $('emptyAdd')?.addEventListener('click', () => deptForm());
    return;
  }

  stage.innerHTML = groups.map((g, i) => {
    const tree = toTree(g.members);
    return `
      <section class="dept" style="animation-delay:${i * 90}ms">
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
          : `<div class="empty" style="padding:26px">
               <p style="margin:0">ยังไม่มีพนักงานในแผนกนี้</p>
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
  drag.departmentId = target.departmentId;   // ย้ายตามแผนกหัวหน้าใหม่
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

    <div class="sheet-body">
      <div class="section-title">ข้อมูลทั่วไป</div>
      ${row('ชื่อเล่น', emp.nickname)}
      ${row('ตำแหน่ง', emp.position)}
      ${row('แผนก', dept?.name)}
      ${row('หัวหน้า', mgr?.nickname)}

      <div class="section-title">ข้อมูลโหราศาสตร์</div>
      ${row('วัน/เดือน/ปีเกิด', thaiDate(emp.birthDate))}
      ${row('เวลาเกิด', thaiTime(emp.birthTime))}
      ${row('จังหวัดที่เกิด', emp.birthProvince)}
      ${computed}

      <div class="section-title">รูปดวง</div>
      ${emp.chartUrl
        ? `<img class="chart-img" src="${esc(emp.chartUrl)}" alt="รูปดวงของ ${esc(emp.nickname)}" id="chartImg">`
        : `<div class="chart-drop" id="chartDrop">
             ยังไม่มีรูปดวง<br><small>กดที่นี่เพื่ออัปโหลด หรือลากไฟล์รูปมาวาง</small>
           </div>`}
      <input type="file" id="chartFile" accept="image/*" hidden>
    </div>

    <div class="sheet-foot">
      <button class="btn btn-danger btn-sm" id="btnDel">ลบพนักงาน</button>
      <div class="spacer"></div>
      ${emp.chartUrl ? '<button class="btn btn-sm" id="btnReplace">เปลี่ยนรูปดวง</button>' : ''}
      <button class="btn btn-gold" id="btnEdit">แก้ไขข้อมูล</button>
    </div>
  `, (ov, close) => {

    const file = ov.querySelector('#chartFile');
    const pick = () => file.click();

    ov.querySelector('#chartDrop')?.addEventListener('click', pick);
    ov.querySelector('#btnReplace')?.addEventListener('click', pick);

    ov.querySelector('#chartImg')?.addEventListener('click', () => {
      const lb = document.createElement('div');
      lb.className = 'lightbox';
      lb.innerHTML = `<img src="${esc(emp.chartUrl)}" alt="รูปดวง">`;
      lb.addEventListener('click', () => lb.remove());
      document.body.append(lb);
    });

    // ลากไฟล์มาวาง
    const drop = ov.querySelector('#chartDrop');
    if (drop) {
      ['dragenter','dragover'].forEach(ev =>
        drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave','drop'].forEach(ev =>
        drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', e => {
        const f = e.dataTransfer.files[0];
        if (f) uploadChart(emp, f, close);
      });
    }

    file.addEventListener('change', () => {
      const f = file.files[0];
      if (f) uploadChart(emp, f, close);
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

async function uploadChart(emp, file, close) {
  try {
    toast('กำลังอัปโหลดรูป…');
    const url = await Store.uploadChart(file, emp.id);
    emp.chartUrl = url;
    await Store.saveEmployee(emp);
    close(); render(); detailView(emp.id);
    toast('อัปโหลดรูปดวงแล้ว', 'ok');
  } catch (e) {
    toast(e.message || 'อัปโหลดไม่สำเร็จ', 'err');
  }
}

/* ---------- ฟอร์มพนักงาน ---------- */

function personForm(emp = null) {
  const { departments, employees } = Store.all();
  const isNew = !emp;
  const e = emp || { nickname:'', position:'', departmentId:null, managerId:null,
                     birthDate:'', birthTime:'', birthProvince:'' };

  // ตัวเลือกหัวหน้า — ตัดตัวเองและลูกน้องตัวเองออก (กันวนลูป)
  const banned = new Set();
  if (emp) {
    const walk = pid => employees.filter(x => x.managerId === pid)
      .forEach(c => { banned.add(c.id); walk(c.id); });
    banned.add(emp.id); walk(emp.id);
  }

  const deptOpts = ['<option value="">— ไม่ระบุแผนก —</option>']
    .concat(departments.map(d =>
      `<option value="${esc(d.id)}" ${d.id === e.departmentId ? 'selected' : ''}>${esc(d.name)}</option>`))
    .join('');

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
          <div class="form-2">
            <div>
              <label class="lbl" for="f-bdate">วัน/เดือน/ปีเกิด</label>
              <input type="date" id="f-bdate" value="${esc(e.birthDate)}">
            </div>
            <div>
              <label class="lbl" for="f-btime">เวลาเกิด</label>
              <input type="time" id="f-btime" value="${esc(e.birthTime)}">
            </div>
          </div>
          <div>
            <label class="lbl" for="f-prov">จังหวัดที่เกิด</label>
            <select id="f-prov">${provOpts}</select>
          </div>
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
    ov.querySelector('#pf').addEventListener('submit', async ev => {
      ev.preventDefault();
      const nick = ov.querySelector('#f-nick').value.trim();
      if (!nick) return toast('กรุณากรอกชื่อเล่น', 'err');

      const data = {
        ...e,
        nickname: nick,
        position: ov.querySelector('#f-pos').value.trim(),
        departmentId: ov.querySelector('#f-dept').value || null,
        managerId: ov.querySelector('#f-mgr').value || null,
        birthDate: ov.querySelector('#f-bdate').value || null,
        birthTime: ov.querySelector('#f-btime').value || null,
        birthProvince: ov.querySelector('#f-prov').value || null
      };

      try {
        await Store.saveEmployee(data);
        close(); render();
        toast(isNew ? 'เพิ่มพนักงานแล้ว' : 'บันทึกแล้ว', 'ok');
      } catch (err) {
        toast(err.message || 'บันทึกไม่สำเร็จ', 'err');
      }
    });
  });
}

/* ---------- ฟอร์มแผนก ---------- */

function deptForm(dept = null) {
  const isNew = !dept;
  openModal(`
    <div class="sheet-head">
      <div class="sheet-name">${isNew ? 'เพิ่มแผนก' : 'แก้ชื่อแผนก'}</div>
    </div>
    <form id="df">
      <div class="sheet-body">
        <label class="lbl" for="f-dname">ชื่อแผนก *</label>
        <input type="text" id="f-dname" value="${esc(dept?.name || '')}"
               required maxlength="60" placeholder="เช่น ฝ่ายขาย" autofocus>
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
      try {
        await Store.saveDepartment(dept ? { ...dept, name } : { name });
        close(); render();
        toast(isNew ? 'เพิ่มแผนกแล้ว' : 'บันทึกแล้ว', 'ok');
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
  Wheel.init();
  Sky.init($('sky'), CFG, renderPlanets);
  initGate();
});

})();
