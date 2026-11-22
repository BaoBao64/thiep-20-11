/************************
***** KHAI BÁO: *********
************************/
const W = 360                 //  chiều rộng "logic" của màn chơi
const H = 640                 //  chiều cao "logic"
const GROUND_H = 90           //  chiều cao dải đất (khung code editor)
const DEG = Math.PI / 180     //  đổi độ sang radian

const cvs = document.getElementById('game')
const ctx = cvs.getContext('2d')
const description = document.getElementById('description')
const muteBtn = document.getElementById('mute')

//  Canvas nét trên màn hình Retina: vẽ to gấp dpr lần rồi CSS thu nhỏ lại
const dpr = Math.min(window.devicePixelRatio || 1, 2)
cvs.width = W * dpr
cvs.height = H * dpr
ctx.scale(dpr, dpr)

//  Hình ảnh
const playerImg = new Image()        //  nhân vật: quả trứng
playerImg.src = 'img/player.png'
const bgImg = new Image()            //  bối cảnh: trường học
bgImg.src = 'img/background.jpg'

let frame = 0                        //  đếm số khung hình đã chạy

//  Trạng thái game: 0 = chuẩn bị, 1 = đang chơi, 2 = thua
const gameState = {
    current: 0,
    getReady: 0,
    play: 1,
    gameOver: 2,
    overAt: 0,          //  thời điểm thua (để chặn bấm nhầm chơi lại ngay)
    reason: '',         //  lý do thua, hiện trên màn Game Over
    isRecord: false,    //  ván vừa rồi có phá kỷ lục của mình không
    rank: null          //  hạng trên bảng xếp hạng sau khi lưu điểm
}

/************************
***** ÂM THANH **********
  Tự tạo âm bằng Web Audio API → không cần file .wav
************************/
const sfx = {
    ac: null,
    muted: false,
    init: function () {
        if (!this.ac) {
            const AC = window.AudioContext || window.webkitAudioContext
            if (AC) this.ac = new AC()
        }
    },
    //  phát 1 tiếng "bíp": tần số đầu → tần số cuối trong `dur` giây
    tone: function (from, to, dur, type = 'square', vol = 0.05, delay = 0) {
        if (this.muted || !this.ac) return
        const t = this.ac.currentTime + delay
        const osc = this.ac.createOscillator()
        const gain = this.ac.createGain()
        osc.type = type
        osc.frequency.setValueAtTime(from, t)
        osc.frequency.exponentialRampToValueAtTime(to, t + dur)
        gain.gain.setValueAtTime(vol, t)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
        osc.connect(gain).connect(this.ac.destination)
        osc.start(t)
        osc.stop(t + dur)
    },
    flap:  function () { this.tone(420, 720, 0.09, 'triangle', 0.08) },
    score: function () { this.tone(880, 880, 0.07, 'square', 0.04); this.tone(1320, 1320, 0.12, 'square', 0.04, 0.07) },
    hit:   function () { this.tone(220, 55, 0.35, 'sawtooth', 0.08) },
    swoosh: function () { this.tone(300, 900, 0.15, 'sine', 0.05) },
    record: function () {
        //  phá kỷ lục: 4 nốt đi lên Đô - Mi - Son - Đô (chờ tiếng va chạm xong)
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.18, 'square', 0.05, 0.4 + i * 0.12))
    }
}


/************************
***** BỐI CẢNH **********
************************/
const bg = {
    x: 0,
    dx: 0.3,            //  trôi chậm hơn cột → tạo cảm giác chiều sâu (parallax)
    render: function () {
        if (!bgImg.complete || !bgImg.naturalWidth) {
            ctx.fillStyle = '#7ec3ef'
            ctx.fillRect(0, 0, W, H)
            return
        }
        //  phóng ảnh cho cao bằng phần trời phía trên mặt đất
        const h = H - GROUND_H
        const w = bgImg.naturalWidth * h / bgImg.naturalHeight
        //  vẽ xen kẽ ảnh thường + ảnh lật gương → nối liền không bị "vết cắt"
        for (let i = 0; i < 3; i++) {
            const x = this.x + i * w
            if (x > W) break
            if (i % 2 === 0) {
                ctx.drawImage(bgImg, x, 0, w, h)
            } else {
                ctx.save()
                ctx.translate(x + w, 0)
                ctx.scale(-1, 1)
                ctx.drawImage(bgImg, 0, 0, w, h)
                ctx.restore()
            }
        }
    },
    position: function () {
        if (gameState.current === gameState.play) {
            const h = H - GROUND_H
            const w = bgImg.naturalWidth ? bgImg.naturalWidth * h / bgImg.naturalHeight : W
            this.x = (this.x - this.dx) % (w * 2)
        }
    }
}

/************************
***** CỘT MÃ LỆNH *******
  Mỗi cặp cột là 1 lệnh máy (x86): tên lệnh + các byte mã máy của nó.
  Thân cột chạy các con số hex / nhị phân của chính lệnh đó.
************************/
const INSTRUCTIONS = [
    { op: 'MOV',     bytes: [0xB8, 0x01, 0x00, 0x00, 0x00], note: 'gán giá trị' },
    { op: 'CALL',    bytes: [0xE8, 0x4A, 0x00, 0x00, 0x00], note: 'gọi hàm' },
    { op: 'JMP',     bytes: [0xEB, 0xFE],                   note: 'nhảy' },
    { op: 'RET',     bytes: [0xC3],                         note: 'trả về' },
    { op: 'NOP',     bytes: [0x90],                         note: 'không làm gì' },
    { op: 'PUSH',    bytes: [0x55],                         note: 'đẩy vào stack' },
    { op: 'POP',     bytes: [0x5D],                         note: 'lấy khỏi stack' },
    { op: 'XOR',     bytes: [0x31, 0xC0],                   note: 'xor = 0' },
    { op: 'ADD',     bytes: [0x01, 0xD8],                   note: 'cộng' },
    { op: 'SUB',     bytes: [0x29, 0xD8],                   note: 'trừ' },
    { op: 'CMP',     bytes: [0x39, 0xD8],                   note: 'so sánh' },
    { op: 'JE',      bytes: [0x74, 0x05],                   note: 'nhảy nếu bằng' },
    { op: 'INC',     bytes: [0xFF, 0xC0],                   note: 'tăng 1' },
    { op: 'LEA',     bytes: [0x8D, 0x45, 0xF8],             note: 'lấy địa chỉ' },
    { op: 'SYSCALL', bytes: [0x0F, 0x05],                   note: 'gọi hệ điều hành' }
]
const hex = n => n.toString(16).toUpperCase().padStart(2, '0')
const bin = n => n.toString(2).padStart(8, '0')

const pipes = {
    w: 64,              //  bề rộng thân cột
    capW: 76,           //  bề rộng "nắp" cột (chỗ ghi tên lệnh)
    capH: 38,
    gap: 168,           //  khoảng trống để trứng bay qua
    dx: 2.2,            //  tốc độ trôi sang trái
    spawnEvery: 95,     //  cứ bao nhiêu frame thì sinh cột mới
    rowH: 14,           //  chiều cao 1 dòng số trong thân cột
    pipeGenerator: [],

    reset: function () {
        this.pipeGenerator = []
    },
    //  tạo các dòng chữ cho thân cột: xen kẽ hex và nhị phân
    makeRows: function (ins) {
        const rows = []
        for (let i = 0; i < 6; i++) {
            rows.push(ins.bytes.slice(0, 3).map(hex).join(' '))
            rows.push(bin(ins.bytes[i % ins.bytes.length]))
        }
        return rows
    },
    drawBody: function (pipe, top, bottom) {
        const x = pipe.x
        const h = bottom - top
        if (h <= 0) return
        ctx.save()
        //  nền cột như màn hình terminal
        ctx.fillStyle = 'rgba(13, 17, 23, 0.92)'
        ctx.fillRect(x, top, this.w, h)
        ctx.strokeStyle = '#3fb950'
        ctx.lineWidth = 2
        ctx.strokeRect(x + 1, top, this.w - 2, h)
        //  cắt vùng vẽ để chữ không tràn ra ngoài cột
        ctx.beginPath()
        ctx.rect(x + 2, top, this.w - 4, h)
        ctx.clip()
        ctx.font = '500 10px "JetBrains Mono", monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        //  chữ chạy dọc chậm rãi kiểu "Matrix"
        const scroll = (frame * 0.4 + pipe.seed) % (this.rowH * pipe.rows.length)
        let i = 0
        for (let y = top - scroll; y < bottom + this.rowH; y += this.rowH, i++) {
            const text = pipe.rows[i % pipe.rows.length]
            const isHex = text.includes(' ') || text.length < 8
            ctx.fillStyle = isHex ? 'rgba(121, 192, 255, 0.85)' : 'rgba(63, 185, 80, 0.75)'
            ctx.fillText(text, x + this.w / 2, y + this.rowH / 2)
        }
        ctx.restore()
    },
    drawCap: function (pipe, y) {
        const x = pipe.x - (this.capW - this.w) / 2
        ctx.save()
        ctx.fillStyle = '#161b22'
        ctx.strokeStyle = '#3fb950'
        ctx.lineWidth = 2
        roundRect(x, y, this.capW, this.capH, 6)
        ctx.fill()
        ctx.stroke()
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ffa657'
        ctx.font = '700 13px "JetBrains Mono", monospace'
        ctx.fillText(pipe.ins.op, x + this.capW / 2, y + 13)
        ctx.fillStyle = '#79c0ff'
        ctx.font = '500 10px "JetBrains Mono", monospace'
        ctx.fillText('0x' + hex(pipe.ins.bytes[0]), x + this.capW / 2, y + 28)
        ctx.restore()
    },
    render: function () {
        for (const pipe of this.pipeGenerator) {
            const gapTop = pipe.y
            const gapBot = pipe.y + this.gap
            //  cột trên: từ đỉnh màn hình xuống tới khe
            this.drawBody(pipe, 0, gapTop - this.capH)
            this.drawCap(pipe, gapTop - this.capH)
            //  cột dưới: từ khe xuống tới mặt đất
            this.drawBody(pipe, gapBot + this.capH, H - GROUND_H)
            this.drawCap(pipe, gapBot)
        }
    },
    //  các hình chữ nhật dùng để kiểm tra va chạm của 1 cặp cột
    hitboxes: function (pipe) {
        const capX = pipe.x - (this.capW - this.w) / 2
        return [
            { x: pipe.x, y: -200, w: this.w, h: pipe.y - this.capH + 200 },      //  thân trên (kéo lên trên màn hình luôn)
            { x: capX, y: pipe.y - this.capH, w: this.capW, h: this.capH },        //  nắp trên
            { x: capX, y: pipe.y + this.gap, w: this.capW, h: this.capH },         //  nắp dưới
            { x: pipe.x, y: pipe.y + this.gap + this.capH, w: this.w, h: H }       //  thân dưới
        ]
    },
    position: function () {
        if (gameState.current !== gameState.play) return

        //  sinh cặp cột mới
        if (frame % this.spawnEvery === 0) {
            const minY = 70 + this.capH
            const maxY = H - GROUND_H - this.gap - this.capH - 40
            const ins = INSTRUCTIONS[Math.floor(Math.random() * INSTRUCTIONS.length)]
            this.pipeGenerator.push({
                x: W,
                y: Math.floor(minY + Math.random() * (maxY - minY)),   //  vị trí khe (ngẫu nhiên)
                ins: ins,
                rows: this.makeRows(ins),
                seed: Math.random() * 200,
                passed: false
            })
        }

        for (const pg of this.pipeGenerator) {
            pg.x -= this.dx

            //  ghi điểm khi trứng vừa bay qua hết cột
            if (!pg.passed && pg.x + this.capW < player.x - player.rx) {
                pg.passed = true
                score.add()
            }

            //  VA CHẠM: hình elip (quả trứng) với từng hình chữ nhật của cột
            for (const box of this.hitboxes(pg)) {
                if (ellipseHitsRect(player.x, player.y, player.rx, player.ry, box)) {
                    gameOverNow('Segmentation fault tại 0x' + hex(pg.ins.bytes[0]) + ' · ' + pg.ins.op)
                    sfx.hit()
                    return
                }
            }
        }

        //  xoá cột đã trôi khỏi màn hình (giải phóng bộ nhớ)
        if (this.pipeGenerator.length && this.pipeGenerator[0].x < -this.capW) {
            this.pipeGenerator.shift()
        }
    }
}

/************************
***** MẶT ĐẤT **********
  Một khung code editor có số dòng, chữ trôi cùng tốc độ với cột
************************/
const ground = {
    x: 0,
    dx: pipes.dx,
    lines: [
        [['while', '#ff7b72'], [' (egg.alive) {   ', '#e6edf3']],
        [['  egg', '#e6edf3'], ['.flap', '#d2a8ff'], ['();  ', '#e6edf3'], ['// bay lên   ', '#8b949e']],
        [['  score', '#e6edf3'], ['++', '#ff7b72'], [';  ', '#e6edf3'], ['// +1 điểm   ', '#8b949e']],
        [['}  ', '#e6edf3'], ['return ', '#ff7b72'], ['0', '#79c0ff'], [';   ', '#e6edf3']]
    ],
    render: function () {
        const top = H - GROUND_H
        ctx.fillStyle = '#0d1117'
        ctx.fillRect(0, top, W, GROUND_H)
        ctx.fillStyle = '#3fb950'
        ctx.fillRect(0, top, W, 3)
        ctx.font = '500 13px "JetBrains Mono", monospace'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'left'
        const gutter = 30
        ctx.save()
        ctx.beginPath()
        ctx.rect(gutter, top + 3, W - gutter, GROUND_H - 3)
        ctx.clip()
        this.lines.forEach((parts, i) => {
            const y = top + 16 + i * 20
            //  đo độ dài cả dòng rồi lặp lại để chữ trôi liền mạch
            const full = parts.map(p => p[0]).join('')
            const lineW = ctx.measureText(full).width
            let x = gutter + 8 + (this.x % lineW)
            while (x < W) {
                let cx = x
                for (const [text, color] of parts) {
                    ctx.fillStyle = color
                    ctx.fillText(text, cx, y)
                    cx += ctx.measureText(text).width
                }
                x += lineW
            }
        })
        ctx.restore()
        //  cột số dòng bên trái
        ctx.fillStyle = '#161b22'
        ctx.fillRect(0, top + 3, gutter, GROUND_H - 3)
        ctx.fillStyle = '#6e7681'
        ctx.textAlign = 'right'
        this.lines.forEach((_, i) => ctx.fillText(String(i + 1), gutter - 7, top + 16 + i * 20))
    },
    position: function () {
        if (gameState.current === gameState.play) {
            this.x -= this.dx
        }
    }
}

/************************
***** ĐIỂM SỐ **********
  Không giới hạn điểm: bay được bao xa thì tính bấy nhiêu.
************************/
const score = {
    current: 0,
    best: 0,            //  kỷ lục của người chơi hiện tại (lấy từ bảng xếp hạng)
    add: function () {
        this.current++
        sfx.score()
    },
    reset: function () {
        this.current = 0
    },
    render: function () {
        if (gameState.current === gameState.play) {
            outlinedText(String(this.current), W / 2, 62, '800 52px "Baloo 2", sans-serif', '#ffffff')
        }
    }
}

/************************
***** NHÂN VẬT **********
************************/
const player = {
    x: 90,
    y: 280,
    w: 46,              //  kích thước vẽ ra màn hình
    h: 60,
    rx: 19,             //  bán kính hitbox hình elip (nhỏ hơn hình 1 chút cho công bằng)
    ry: 25,
    fly: 6.8,           //  lực bay lên mỗi lần nhấn
    gravity: 0.4,       //  trọng lực cộng thêm vào vận tốc mỗi frame
    maxFall: 11,
    velocity: 0,
    rotation: 0,
    render: function () {
        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.rotate(this.rotation)
        if (playerImg.complete && playerImg.naturalWidth) {
            ctx.drawImage(playerImg, -this.w / 2, -this.h / 2, this.w, this.h)
        } else {
            ctx.fillStyle = '#c97a45'
            ctx.beginPath()
            ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2)
            ctx.fill()
        }
        ctx.restore()
    },
    flap: function () {
        this.velocity = -this.fly
    },
    reset: function () {
        this.y = 280
        this.velocity = 0
        this.rotation = 0
    },
    position: function () {
        if (gameState.current === gameState.getReady) {
            //  màn chờ: trứng nhấp nhô lên xuống
            this.y = 280 + Math.sin(frame / 12) * 8
            this.rotation = 0
            return
        }
        //  rơi theo trọng lực
        this.velocity = Math.min(this.velocity + this.gravity, this.maxFall)
        this.y += this.velocity

        //  nghiêng theo vận tốc: bay lên thì ngửa, rơi thì cắm đầu (làm mượt bằng lerp)
        const target = this.velocity < 0 ? -18 * DEG : Math.min(this.velocity * 7, 75) * DEG
        this.rotation += (target - this.rotation) * 0.2

        //  chạm đất
        const floor = H - GROUND_H - this.h / 2 + 4
        if (this.y >= floor) {
            this.y = floor
            this.velocity = 0
            if (gameState.current === gameState.play) {
                gameOverNow('Stack underflow · rơi xuống đất')
                sfx.hit()
            }
        }
        //  không cho bay vượt khỏi mép trên
        if (this.y - this.h / 2 <= 0) {
            this.y = this.h / 2
            this.velocity = 0
        }
    }
}

/************************
***** MÀN HÌNH CHỜ *****
************************/
const getReady = {
    render: function () {
        if (gameState.current !== gameState.getReady) return
        panel(30, 92, W - 60, 178)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        outlinedText('SCP ICT', W / 2, 134, '800 44px "Baloo 2", sans-serif', '#ffb347')
        ctx.fillStyle = '#ffd27a'
        ctx.font = '700 15px "Baloo 2", sans-serif'
        ctx.fillText('Bay càng xa, điểm càng cao!', W / 2, 172)
        ctx.fillStyle = '#e6edf3'
        ctx.font = '600 15px "Baloo 2", sans-serif'
        ctx.fillText('Người chơi: ' + (playerName || '???'), W / 2, 200)
        ctx.font = '500 12px "JetBrains Mono", monospace'
        ctx.fillStyle = '#8b949e'
        ctx.fillText('kỷ lục = ' + score.best, W / 2, 224)
        ctx.fillStyle = '#3fb950'
        const blink = Math.floor(frame / 30) % 2 === 0
        ctx.fillText('> nhấn để chạy' + (blink ? '_' : ' '), W / 2, 250)
    }
}

/************************
***** MÀN HÌNH THUA *****
************************/
const gameOver = {
    render: function () {
        if (gameState.current !== gameState.gameOver) return
        panel(24, 110, W - 48, 262)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        outlinedText('GAME OVER', W / 2, 150, '800 38px "Baloo 2", sans-serif', '#ff7b72')
        ctx.fillStyle = '#ffa657'
        ctx.font = '500 11px "JetBrains Mono", monospace'
        ctx.fillText(gameState.reason, W / 2, 186)
        //  điểm ván này và kỷ lục
        ctx.fillStyle = '#8b949e'
        ctx.font = '600 15px "Baloo 2", sans-serif'
        ctx.fillText('Điểm', W / 2 - 70, 220)
        ctx.fillText('Kỷ lục', W / 2 + 70, 220)
        ctx.fillStyle = '#ffffff'
        ctx.font = '800 40px "Baloo 2", sans-serif'
        ctx.fillText(String(score.current), W / 2 - 70, 258)
        ctx.fillStyle = gameState.isRecord ? '#ffb347' : '#ffffff'
        ctx.fillText(String(score.best), W / 2 + 70, 258)
        if (gameState.isRecord) {
            ctx.fillStyle = '#ffb347'
            ctx.font = '700 11px "JetBrains Mono", monospace'
            ctx.fillText('KỶ LỤC MỚI!', W / 2 + 70, 286)
        }
        //  hạng trên bảng xếp hạng
        ctx.font = '700 15px "Baloo 2", sans-serif'
        if (gameState.rank) {
            ctx.fillStyle = '#ffd27a'
            ctx.fillText('🏆 Hạng #' + gameState.rank + ' trên bảng xếp hạng', W / 2, 314)
        } else if (score.current > 0 && board.status === 'loading') {
            ctx.fillStyle = '#8b949e'
            ctx.fillText('Đang lưu điểm…', W / 2, 314)
        } else if (score.current === 0) {
            ctx.fillStyle = '#8b949e'
            ctx.fillText('Qua ít nhất 1 cột để lên bảng', W / 2, 314)
        }
        //  chỉ cho chơi lại sau 0.6 giây để tránh bấm nhầm
        if (performance.now() - gameState.overAt > 600) {
            ctx.fillStyle = '#3fb950'
            ctx.font = '500 12px "JetBrains Mono", monospace'
            ctx.fillText('> nhấn để chạy lại', W / 2, 346)
        }
    }
}

/************************
***** PHÁO GIẤY *********
  Bắn ra khi người chơi phá kỷ lục của chính mình
************************/
const fx = {
    confetti: [],
    burst: function () {
        const colors = ['#ffb347', '#3fb950', '#79c0ff', '#ff7b72', '#d2a8ff', '#ffd27a']
        for (let i = 0; i < 120; i++) {
            this.confetti.push({
                x: W / 2 + (Math.random() - 0.5) * 60,
                y: 230,
                vx: (Math.random() - 0.5) * 9,
                vy: -Math.random() * 9 - 3,
                size: 4 + Math.random() * 5,
                rot: Math.random() * Math.PI,
                vr: (Math.random() - 0.5) * 0.3,
                color: colors[i % colors.length]
            })
        }
    },
    update: function () {
        for (const c of this.confetti) {
            c.vy += 0.18                //  pháo giấy cũng rơi theo trọng lực
            c.vx *= 0.99
            c.x += c.vx
            c.y += c.vy
            c.rot += c.vr
        }
        this.confetti = this.confetti.filter(c => c.y < H + 20)
    },
    render: function () {
        for (const c of this.confetti) {
            ctx.save()
            ctx.translate(c.x, c.y)
            ctx.rotate(c.rot)
            ctx.fillStyle = c.color
            ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2)
            ctx.restore()
        }
    }
}

/************************
***** HÀM TIỆN ÍCH ******
************************/
function roundRect(x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
}
function panel(x, y, w, h) {
    ctx.save()
    ctx.fillStyle = 'rgba(13, 17, 23, 0.88)'
    ctx.strokeStyle = '#30363d'
    ctx.lineWidth = 2
    roundRect(x, y, w, h, 14)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
}
function outlinedText(text, x, y, font, color) {
    ctx.save()
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 7
    ctx.strokeStyle = '#0d1117'
    ctx.strokeText(text, x, y)
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
    ctx.restore()
}
//  Elip (cx, cy, rx, ry) có chạm hình chữ nhật không?
//  Ý tưởng: tìm điểm trên hình chữ nhật gần tâm elip nhất, rồi xem điểm đó có nằm trong elip.
function ellipseHitsRect(cx, cy, rx, ry, r) {
    const nx = Math.max(r.x, Math.min(cx, r.x + r.w))
    const ny = Math.max(r.y, Math.min(cy, r.y + r.h))
    const dx = (nx - cx) / rx
    const dy = (ny - cy) / ry
    return dx * dx + dy * dy < 1
}
function gameOverNow(reason) {
    gameState.current = gameState.gameOver
    gameState.reason = reason
    gameState.overAt = performance.now()
    gameState.rank = null
    description.style.visibility = 'visible'
    //  phá kỷ lục của chính mình?
    gameState.isRecord = score.current > score.best
    if (gameState.isRecord) {
        score.best = score.current
        fx.burst()
        sfx.record()
    }
    //  gửi điểm lên bảng xếp hạng, xong thì hiện hạng
    const name = playerName
    board.submit(name, score.current).then(rank => {
        if (gameState.current === gameState.gameOver && name === playerName) gameState.rank = rank
    })
}

/************************
***** VÒNG LẶP GAME *****
************************/
const draw = () => {
    bg.render()
    pipes.render()
    ground.render()
    player.render()
    score.render()
    getReady.render()
    gameOver.render()
    fx.render()
}
const update = () => {
    player.position()
    bg.position()
    pipes.position()
    ground.position()
    fx.update()
}

//  Bước thời gian cố định 60 lần/giây → game chạy cùng tốc độ trên màn 60Hz hay 120Hz
const STEP = 1000 / 60
let last = performance.now()
let acc = 0
const loop = (now) => {
    acc += Math.min(now - last, 250)
    last = now
    while (acc >= STEP) {
        update()
        frame++
        acc -= STEP
    }
    draw()
    requestAnimationFrame(loop)
}

/*************************
***** KHỞI ĐỘNG **********
*************************/
nameUI.init()
board.load().then(() => { if (playerName) score.best = board.bestOf(playerName) })
//  tự làm mới bảng xếp hạng mỗi 30 giây khi không đang bay
setInterval(() => {
    if (gameState.current !== gameState.play && !document.hidden) board.load()
}, 30000)
requestAnimationFrame(loop)

/*************************
***** XỬ LÝ SỰ KIỆN *****
*************************/
const action = () => {
    if (nameUI.isOpen()) return
    sfx.init()
    if (gameState.current === gameState.getReady) {
        if (!playerName) { nameUI.open(); return }      //  phải có tên mới được chơi
        gameState.current = gameState.play
        frame = 0                       //  để cột đầu tiên xuất hiện ngay
        description.style.visibility = 'hidden'
    }
    if (gameState.current === gameState.play) {
        player.flap()
        sfx.flap()
        return
    }
    if (gameState.current === gameState.gameOver) {
        if (performance.now() - gameState.overAt < 600) return
        pipes.reset()
        score.reset()
        player.reset()
        sfx.swoosh()
        gameState.current = gameState.getReady
    }
}
//  pointerdown = chuột + cảm ứng trong 1 sự kiện
cvs.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    action()
})
document.addEventListener('keydown', (e) => {
    //  đang gõ tên thì phím Space là để gõ chữ, không phải để bay
    if (e.target.closest && e.target.closest('input, textarea, button, form')) return
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()              //  chặn trang bị cuộn khi nhấn Space
        if (!e.repeat) action()
    }
})
muteBtn.addEventListener('click', () => {
    sfx.muted = !sfx.muted
    muteBtn.textContent = sfx.muted ? '🔇' : '🔊'
    muteBtn.blur()
})
