/* ============================================================
   HORA — วงล้อจักรราศี (สร้างเป็น SVG ด้วยโค้ด คมชัดทุกขนาด)
   ============================================================ */

const Wheel = (() => {

  const NS = 'http://www.w3.org/2000/svg';
  const C = 500;                       // จุดศูนย์กลาง
  const D2R = Math.PI / 180;

  const RASI = [
    { th:'เมษ',   glyph:'♈' }, { th:'พฤษภ', glyph:'♉' }, { th:'เมถุน', glyph:'♊' },
    { th:'กรกฎ',  glyph:'♋' }, { th:'สิงห์',  glyph:'♌' }, { th:'กันย์',  glyph:'♍' },
    { th:'ตุลย์',  glyph:'♎' }, { th:'พิจิก', glyph:'♏' }, { th:'ธนู',   glyph:'♐' },
    { th:'มังกร', glyph:'♑' }, { th:'กุมภ์',  glyph:'♒' }, { th:'มีน',   glyph:'♓' }
  ];

  const el = (name, attrs = {}) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  /** จุดบนวงกลม (0° = บนสุด เดินตามเข็ม) */
  const pt = (r, deg) => ({
    x: C + r * Math.sin(deg * D2R),
    y: C - r * Math.cos(deg * D2R)
  });

  function defs(svg, id) {
    const d = el('defs');

    const g1 = el('linearGradient', { id:`gold-${id}`, x1:'0', y1:'0', x2:'1', y2:'1' });
    g1.append(
      el('stop', { offset:'0%',   'stop-color':'#f7e4b0' }),
      el('stop', { offset:'45%',  'stop-color':'#e9c877' }),
      el('stop', { offset:'100%', 'stop-color':'#8f6f2e' })
    );

    const g2 = el('linearGradient', { id:`violet-${id}`, x1:'0', y1:'1', x2:'1', y2:'0' });
    g2.append(
      el('stop', { offset:'0%',   'stop-color':'#8b7bd8' }),
      el('stop', { offset:'100%', 'stop-color':'#6fa8ff' })
    );

    const blur = el('filter', { id:`soft-${id}`, x:'-30%', y:'-30%', width:'160%', height:'160%' });
    blur.append(el('feGaussianBlur', { stdDeviation:'3.4' }));

    d.append(g1, g2, blur);
    svg.append(d);
  }

  /* ---------- วงล้อชั้นนอก: ละเอียด มีชื่อราศี ---------- */

  function buildOuter(svg) {
    defs(svg, 'o');
    const g = el('g', { fill:'none', 'stroke-linecap':'round' });

    // วงกลมซ้อน
    [488, 470, 396, 330, 262, 196].forEach((r, i) => {
      g.append(el('circle', {
        cx:C, cy:C, r,
        stroke:`url(#gold-o)`,
        'stroke-width': i === 0 ? 1.6 : i === 2 ? 1.2 : 0.7,
        opacity: i === 0 ? 0.9 : 0.45
      }));
    });

    // ขีดองศา — ทุก 1° สั้น, ทุก 5° ยาว, ทุก 30° ยาวสุด
    for (let d = 0; d < 360; d++) {
      const major = d % 30 === 0, mid = d % 5 === 0;
      const r1 = 470, r2 = major ? 440 : mid ? 456 : 463;
      const a = pt(r1, d), b = pt(r2, d);
      g.append(el('line', {
        x1:a.x, y1:a.y, x2:b.x, y2:b.y,
        stroke: major ? 'url(#gold-o)' : '#e9c877',
        'stroke-width': major ? 1.8 : mid ? 0.9 : 0.5,
        opacity: major ? 0.95 : mid ? 0.5 : 0.28
      }));
    }

    // เส้นแบ่ง 12 ราศี ลากถึงใจกลาง
    for (let i = 0; i < 12; i++) {
      const a = pt(488, i * 30), b = pt(196, i * 30);
      g.append(el('line', {
        x1:a.x, y1:a.y, x2:b.x, y2:b.y,
        stroke:'url(#gold-o)', 'stroke-width':0.9, opacity:0.42
      }));
    }

    // ชื่อราศี + สัญลักษณ์
    for (let i = 0; i < 12; i++) {
      const mid = i * 30 + 15;

      const pg = pt(432, mid);
      const glyph = el('text', {
        x:pg.x, y:pg.y, fill:'url(#gold-o)',
        'font-size':'30', 'text-anchor':'middle', 'dominant-baseline':'central',
        transform:`rotate(${mid} ${pg.x} ${pg.y})`, opacity:'0.95'
      });
      glyph.textContent = RASI[i].glyph;

      const pn = pt(363, mid);
      const name = el('text', {
        x:pn.x, y:pn.y, fill:'#f3ddaa',
        'font-size':'23', 'font-family':'Kanit, sans-serif', 'font-weight':'300',
        'text-anchor':'middle', 'dominant-baseline':'central',
        transform:`rotate(${mid} ${pn.x} ${pn.y})`, opacity:'0.8'
      });
      name.textContent = RASI[i].th;

      const pnum = pt(296, mid);
      const num = el('text', {
        x:pnum.x, y:pnum.y, fill:'#8b7bd8',
        'font-size':'19', 'font-family':'Kanit, sans-serif',
        'text-anchor':'middle', 'dominant-baseline':'central',
        transform:`rotate(${mid} ${pnum.x} ${pnum.y})`, opacity:'0.7'
      });
      num.textContent = ['๑','๒','๓','๔','๕','๖','๗','๘','๙','๑๐','๑๑','๑๒'][i];

      g.append(glyph, name, num);
    }

    svg.append(g);
  }

  /* ---------- วงล้อชั้นใน: ลายเรขาคณิต หมุนสวนทาง ---------- */

  function buildInner(svg) {
    defs(svg, 'i');
    const g = el('g', { fill:'none' });

    g.append(el('circle', { cx:C, cy:C, r:470, stroke:'url(#violet-i)',
                            'stroke-width':1.1, opacity:0.5 }));
    g.append(el('circle', { cx:C, cy:C, r:300, stroke:'url(#gold-i)',
                            'stroke-width':0.8, opacity:0.4 }));

    // ดาว 12 แฉก (เชื่อมจุดข้ามวง)
    const step = 5;   // เชื่อมจุดที่ห่างกัน 5 ตำแหน่ง = ลายดาวคม
    for (let i = 0; i < 12; i++) {
      const a = pt(470, i * 30), b = pt(470, ((i + step) % 12) * 30);
      g.append(el('line', {
        x1:a.x, y1:a.y, x2:b.x, y2:b.y,
        stroke:'url(#violet-i)', 'stroke-width':0.75, opacity:0.32
      }));
    }

    // สามเหลี่ยมธาตุ 4 ธาตุ (ไฟ ดิน ลม น้ำ) — เชื่อมราศีตรีโกณ
    for (let base = 0; base < 3; base++) {
      const pts = [0, 4, 8].map(k => pt(300, (base + k) * 30 + 15));
      g.append(el('polygon', {
        points: pts.map(p => `${p.x},${p.y}`).join(' '),
        stroke:'url(#gold-i)', 'stroke-width':0.7, opacity:0.22
      }));
    }

    // จุดเรืองแสงตามมุมราศี
    for (let i = 0; i < 12; i++) {
      const p = pt(470, i * 30);
      g.append(el('circle', { cx:p.x, cy:p.y, r:3.4, fill:'#e9c877',
                              stroke:'none', opacity:0.75, filter:'url(#soft-i)' }));
      g.append(el('circle', { cx:p.x, cy:p.y, r:1.7, fill:'#fff5dd',
                              stroke:'none', opacity:0.9 }));
    }

    svg.append(g);
  }

  function init() {
    const outer = document.getElementById('wheelOuter');
    const inner = document.getElementById('wheelInner');
    if (outer) buildOuter(outer);
    if (inner) buildInner(inner);
  }

  return { init, RASI };
})();

window.Wheel = Wheel;
