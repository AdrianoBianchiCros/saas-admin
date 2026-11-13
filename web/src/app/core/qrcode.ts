/**
 * QR code gerado aqui mesmo, sem biblioteca externa (o mesmo do MiniCRM).
 * Modo byte, versões 1 a 10, correção de erros nível M: suficiente para o endereço otpauth:// do app autenticador.
 */

// [codewords de correção por bloco, nº de blocos e tamanho do grupo 1, idem grupo 2]
const TABELA: number[][] = [
  [],
  [10, 1, 16],
  [16, 1, 28],
  [26, 1, 44],
  [18, 2, 32],
  [24, 2, 43],
  [16, 4, 27],
  [18, 4, 31],
  [22, 2, 38, 2, 39],
  [22, 3, 36, 2, 37],
  [26, 4, 43, 1, 44],
];
const ALINHAMENTO: number[][] = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

const MASCARAS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 == 0,
  (x, y) => y % 2 == 0,
  (x) => x % 3 == 0,
  (x, y) => (x + y) % 3 == 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 == 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) == 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 == 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 == 0,
];

/** Matriz do QR code: true = módulo escuro. */
export function qrMatriz(texto: string): boolean[][] {
  const data = [...new TextEncoder().encode(texto)];
  const T = TABELA;
  const cap = (v: number) => T[v][1] * T[v][2] + (T[v][3] || 0) * (T[v][4] || 0);
  const cbits = (v: number) => (v < 10 ? 8 : 16);
  let v = 1;
  while (v <= 10 && 4 + cbits(v) + data.length * 8 > cap(v) * 8) v++;
  if (v > 10) throw new Error('Texto longo demais para o QR code.');

  // dados: modo byte, tamanho, bytes, terminador e preenchimento
  const nData = cap(v);
  const bits: number[] = [];
  const put = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  put(4, 4);
  put(data.length, cbits(v));
  data.forEach((b) => put(b, 8));
  put(0, Math.min(4, nData * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const cw: number[] = [];
  for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let p = 0; cw.length < nData; p ^= 1) cw.push(p ? 0x11 : 0xec);

  // correção de erros Reed-Solomon por bloco, depois intercala os blocos
  const mul = (x: number, y: number) => {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  };
  const ecN = T[v][0];
  const div = new Array<number>(ecN).fill(0);
  div[ecN - 1] = 1;
  for (let i = 0, root = 1; i < ecN; i++) {
    for (let j = 0; j < ecN; j++) {
      div[j] = mul(div[j], root);
      if (j + 1 < ecN) div[j] ^= div[j + 1];
    }
    root = mul(root, 2);
  }
  const blocos: [number[], number[]][] = [];
  let k = 0;
  for (const [nb, len] of [
    [T[v][1], T[v][2]],
    [T[v][3] || 0, T[v][4] || 0],
  ]) {
    for (let b = 0; b < nb; b++) {
      const d = cw.slice(k, (k += len));
      const ec = new Array<number>(ecN).fill(0);
      d.forEach((x) => {
        const f = x ^ (ec.shift() as number);
        ec.push(0);
        div.forEach((c, i) => (ec[i] ^= mul(c, f)));
      });
      blocos.push([d, ec]);
    }
  }
  const todos: number[] = [];
  for (let i = 0; i < Math.max(...blocos.map((b) => b[0].length)); i++) {
    blocos.forEach((b) => {
      if (i < b[0].length) todos.push(b[0][i]);
    });
  }
  for (let i = 0; i < ecN; i++) blocos.forEach((b) => todos.push(b[1][i]));

  // padrões fixos: localizadores, temporização, alinhamento, formato e versão
  const n = v * 4 + 17;
  const M = [...Array(n)].map(() => new Array<boolean>(n).fill(false));
  const F = M.map((r) => r.map(() => false));
  const set = (x: number, y: number, d: boolean) => {
    M[y][x] = d;
    F[y][x] = true;
  };
  for (let i = 0; i < n; i++) {
    set(6, i, i % 2 == 0);
    set(i, 6, i % 2 == 0);
  }
  const localizador = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < n && y >= 0 && y < n) set(x, y, d != 2 && d != 4);
      }
    }
  };
  localizador(3, 3);
  localizador(n - 4, 3);
  localizador(3, n - 4);
  const al = ALINHAMENTO[v];
  const ultimo = al.length - 1;
  al.forEach((a, i) =>
    al.forEach((b, j) => {
      if ((i == 0 && j == 0) || (i == 0 && j == ultimo) || (i == ultimo && j == 0)) return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) != 1);
      }
    }),
  );
  const formato = (mascara: number) => {
    let r = mascara;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((mascara << 10) | r) ^ 0x5412;
    const g = (i: number) => ((b >>> i) & 1) == 1;
    for (let i = 0; i <= 5; i++) set(8, i, g(i));
    set(8, 7, g(6));
    set(8, 8, g(7));
    set(7, 8, g(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
    for (let i = 0; i < 8; i++) set(n - 1 - i, 8, g(i));
    for (let i = 8; i < 15; i++) set(8, n - 15 + i, g(i));
    set(8, n - 8, true);
  };
  formato(0);
  if (v >= 7) {
    let r = v;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (v << 12) | r;
    for (let i = 0; i < 18; i++) {
      const d = ((b >>> i) & 1) == 1;
      const a = n - 11 + (i % 3);
      const c = Math.floor(i / 3);
      set(a, c, d);
      set(c, a, d);
    }
  }

  // dados em zigue-zague
  let i = 0;
  for (let direita = n - 1; direita >= 1; direita -= 2) {
    if (direita == 6) direita = 5;
    for (let vert = 0; vert < n; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = direita - j;
        const y = ((direita + 1) & 2) == 0 ? n - 1 - vert : vert;
        if (!F[y][x] && i < todos.length * 8) {
          M[y][x] = ((todos[i >>> 3] >>> (7 - (i & 7))) & 1) == 1;
          i++;
        }
      }
    }
  }

  // escolhe a máscara com menor penalidade
  const inverter = (m: number) => {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!F[y][x] && MASCARAS[m](x, y)) M[y][x] = !M[y][x];
  };
  const penalidade = () => {
    let s = 0;
    let escuros = 0;
    for (let a = 0; a < n; a++) {
      for (const l of [M[a], M.map((r) => r[a])]) {
        let seq = 1;
        for (let x = 1; x <= n; x++) {
          if (x < n && l[x] == l[x - 1]) seq++;
          else {
            if (seq >= 5) s += seq - 2;
            seq = 1;
          }
        }
        const str = l.map((d) => (d ? 1 : 0)).join('');
        for (const p of ['10111010000', '00001011101']) {
          for (let at = str.indexOf(p); at >= 0; at = str.indexOf(p, at + 1)) s += 40;
        }
      }
    }
    for (let y = 0; y < n - 1; y++) {
      for (let x = 0; x < n - 1; x++) {
        const c = M[y][x];
        if (c == M[y][x + 1] && c == M[y + 1][x] && c == M[y + 1][x + 1]) s += 3;
      }
    }
    M.forEach((r) => r.forEach((d) => (escuros += d ? 1 : 0)));
    return s + Math.floor(Math.abs(escuros * 20 - n * n * 10) / (n * n)) * 10;
  };
  let melhor = 0;
  let menor = Infinity;
  for (let m = 0; m < 8; m++) {
    inverter(m);
    formato(m);
    const s = penalidade();
    if (s < menor) {
      menor = s;
      melhor = m;
    }
    inverter(m);
  }
  inverter(melhor);
  formato(melhor);
  return M;
}

/** Desenho do QR code para um <svg>: tamanho (com margem de 4 módulos) e o caminho dos módulos escuros. */
export function qrDesenho(texto: string): { tamanho: number; caminho: string } {
  const M = qrMatriz(texto);
  let caminho = '';
  M.forEach((r, y) =>
    r.forEach((d, x) => {
      if (d) caminho += `M${x + 4},${y + 4}h1v1h-1z`;
    }),
  );
  return { tamanho: M.length + 8, caminho };
}
