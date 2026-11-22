/************************
***** BẢNG XẾP HẠNG *****
  - Có link Google Apps Script trong config.js → cả lớp dùng chung 1 bảng (lưu trên Google Sheet)
  - Chưa có link → bảng chỉ lưu trên máy này (localStorage)
  Mỗi tên chỉ giữ 1 dòng: điểm CAO NHẤT của tên đó.
************************/
const LOCAL_BOARD_KEY = 'scp-ict-board'
const NAME_KEY = 'scp-ict-name'
const SHOW_TOP = 20

//  Làm sạch tên: bỏ ký tự lạ, gộp khoảng trắng, tối đa 20 ký tự
function cleanName(raw) {
    return String(raw || '')
        .replace(/[\u0000-\u001f\u007f<>]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 20)
}
const sameName = (a, b) => a.toLowerCase() === b.toLowerCase()

const board = {
    url: ((window.SCP_CONFIG && window.SCP_CONFIG.leaderboardUrl) || '').trim(),
    list: [],               //  [{ name, score, time }]
    status: 'idle',         //  idle | loading | ready | error
    updatedAt: null,

    shared: function () { return this.url !== '' },

    //  ----- lưu trên máy -----
    readLocal: function () {
        try {
            const arr = JSON.parse(localStorage.getItem(LOCAL_BOARD_KEY) || '[]')
            return Array.isArray(arr) ? arr.map(this.normalize).filter(Boolean) : []
        } catch (e) { return [] }
    },
    writeLocal: function (arr) {
        try { localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(arr.slice(0, 100))) } catch (e) { }
    },

    //  kiểm tra 1 dòng dữ liệu có hợp lệ không (dữ liệu từ mạng không đáng tin)
    normalize: function (row) {
        if (!row) return null
        const name = cleanName(row.name)
        const score = Math.floor(Number(row.score))
        if (!name || !Number.isFinite(score) || score < 0) return null
        const time = new Date(row.time || 0).getTime() || 0
        return { name, score, time }
    },

    //  thêm/cập nhật điểm vào 1 danh sách, chỉ giữ điểm cao nhất của mỗi tên
    upsert: function (arr, name, score) {
        const found = arr.find(r => sameName(r.name, name))
        if (!found) arr.push({ name, score, time: Date.now() })
        else if (score > found.score) { found.score = score; found.time = Date.now() }
        return arr
    },

    //  sắp xếp: điểm cao trước; bằng điểm thì ai đạt trước đứng trên
    sorted: function () {
        return [...this.list].sort((a, b) => b.score - a.score || a.time - b.time)
    },
    bestOf: function (name) {
        const r = this.list.find(x => sameName(x.name, name))
        return r ? r.score : 0
    },
    rankOf: function (name) {
        const i = this.sorted().findIndex(x => sameName(x.name, name))
        return i < 0 ? null : i + 1
    },

    //  ----- tải bảng -----
    load: async function () {
        if (!this.shared()) {
            this.list = this.readLocal()
            this.status = 'ready'
            this.render()
            return
        }
        if (this.status === 'loading') return
        this.status = 'loading'
        this.render()
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 10000)     //  quá 10 giây thì thôi
        try {
            const r = await fetch(this.url + (this.url.includes('?') ? '&' : '?') + 't=' + Date.now(), { signal: ctrl.signal })
            const j = await r.json()
            const rows = Array.isArray(j) ? j : (j.data || [])
            this.list = rows.map(this.normalize).filter(Boolean)
            this.status = 'ready'
            this.updatedAt = new Date()
        } catch (e) {
            this.status = 'error'
        } finally {
            clearTimeout(timer)
        }
        this.render()
    },

    //  ----- gửi điểm sau mỗi ván, trả về hạng -----
    submit: async function (name, score) {
        if (!name || score <= 0) return null
        this.writeLocal(this.upsert(this.readLocal(), name, score))
        if (!this.shared()) {
            this.list = this.readLocal()
            this.render()
            return this.rankOf(name)
        }
        //  hiện ngay trên bảng cho người chơi thấy, rồi mới gửi lên Google Sheet
        this.upsert(this.list, name, score)
        this.render()
        try {
            await fetch(this.url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'score', name: name, score: score })
            })
        } catch (e) { }
        await this.load()
        //  Google Sheet đôi khi chậm vài giây: vẫn giữ điểm vừa gửi trên bảng
        this.upsert(this.list, name, score)
        this.render()
        return this.rankOf(name)
    },

    //  ----- vẽ bảng ra HTML -----
    render: function () {
        const ol = document.getElementById('boardList')
        const note = document.getElementById('boardNote')
        if (!ol) return
        const rows = this.sorted()
        const me = playerName
        ol.textContent = ''

        const addRow = (r, rank) => {
            const li = document.createElement('li')
            if (me && sameName(r.name, me)) li.className = 'me'
            const medal = ['🥇', '🥈', '🥉'][rank - 1]
            const rk = document.createElement('span')
            rk.className = 'rk'
            rk.textContent = medal || '#' + rank
            const nm = document.createElement('span')
            nm.className = 'nm'
            nm.textContent = r.name                     //  textContent → không bị chèn mã HTML
            const sc = document.createElement('span')
            sc.className = 'sc'
            sc.textContent = r.score
            li.append(rk, nm, sc)
            ol.appendChild(li)
        }

        rows.slice(0, SHOW_TOP).forEach((r, i) => addRow(r, i + 1))
        //  mình không lọt top thì vẫn hiện dòng của mình ở cuối
        const myRank = me ? this.rankOf(me) : null
        if (myRank && myRank > SHOW_TOP) {
            const gap = document.createElement('li')
            gap.className = 'gap'
            gap.textContent = '⋯'
            ol.appendChild(gap)
            addRow(rows[myRank - 1], myRank)
        }
        if (!rows.length) {
            const li = document.createElement('li')
            li.className = 'empty'
            li.textContent = this.status === 'loading' ? 'Đang tải…' : 'Chưa có ai trên bảng. Bạn là người đầu tiên!'
            ol.appendChild(li)
        }

        if (!this.shared()) {
            note.textContent = 'Bảng đang lưu trên máy này. Thêm link Google Sheet vào config.js để mọi người dùng chung một bảng.'
        } else if (this.status === 'loading') {
            note.textContent = 'Đang cập nhật…'
        } else if (this.status === 'error') {
            note.textContent = 'Chưa tải được bảng xếp hạng. Kiểm tra mạng rồi thử lại.'
        } else {
            const t = this.updatedAt
            note.textContent = rows.length + ' người chơi' + (t ? ' · cập nhật lúc ' + t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '')
        }
    }
}

/************************
***** TÊN NGƯỜI CHƠI *****
************************/
let playerName = ''
try { playerName = cleanName(localStorage.getItem(NAME_KEY)) } catch (e) { }

const nameUI = {
    form: document.getElementById('nameForm'),
    input: document.getElementById('playerName'),
    error: document.getElementById('nameError'),
    who: document.getElementById('who'),
    change: document.getElementById('changeName'),

    isOpen: function () { return !this.form.hidden },
    open: function () {
        this.input.value = playerName
        this.error.hidden = true
        this.form.hidden = false
        setTimeout(() => this.input.focus(), 0)
    },
    close: function () { this.form.hidden = true },
    showWho: function () {
        this.who.textContent = playerName || 'chưa có tên'
    },
    init: function () {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault()
            const name = cleanName(this.input.value)
            if (!name) {
                this.error.hidden = false
                this.input.focus()
                return
            }
            playerName = name
            try { localStorage.setItem(NAME_KEY, name) } catch (err) { }
            this.close()
            this.showWho()
            score.best = board.bestOf(name)
            board.render()
            cvs.focus({ preventScroll: true })
        })
        this.input.addEventListener('input', () => { this.error.hidden = true })
        this.change.addEventListener('click', () => {
            if (gameState.current === gameState.play) return    //  đang bay thì không đổi tên
            this.change.blur()
            this.open()
        })
        this.showWho()
        if (!playerName) this.open()
    }
}
