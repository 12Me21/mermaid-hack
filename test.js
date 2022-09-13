let child_process = require('child_process')

class Style {
	constructor() {
		this._props = {__proto__:null}
	}
	setProperty(key, value) {
		this._props[key] = value
	}
	removeProperty(key, value) {
		delete this._props[key]
	}
	toString() {
		let s = ""
		for (let p in this._props) {
			s+=`${p}: ${this._props[p]}; `
		}
		return s
	}
}

let ids = {}
let n
class Element {
	constructor(tag, namespace=null) {
		this.tagName = tag
		this.namespaceURI = namespace
		this._childs = []
		this._attr = {__proto__:null}
		this.style = new Style()
		this._parent = null
		this._inner = ""
	}
	set innerHTML(text) {
		this._inner = text+""
		if (this.tagName=='style')
			n = this
	}
	get innerHTML() {
		return this._inner
	}
	set textContent(text) {
		while (this._childs.length) {
			this.removeChild(this._childs[0])
		}
		this.innerHTML = text.replace(/&/g, "&amp;").replace(/</g, "&lt;")
	}
	get textContent() {
		return this.innerHTML // todo
	}
	get parentNode() {
		return this._parent
	}
	set parentNode(nw) {
		if (this._parent)
			this._parent.removeChild(this)
		this._parent = nw
	}
	setAttribute(name, value) {
		//console.log('set attr', name, value)
		if (name=='id') {
			//console.log('set id', this, value)
			ids[value] = this
		}
		this._attr[name] = value
	}
	removeAttribute(name, value) {
		delete this._attr[name]
	}
	setAttributeNS(ns, name, value) { //whatever
		//console.log('set attr', name, value)
		this._attr[name] = value
	}
	remove() {
		this.parentNode = null
	}
	get firstChild() {
		return this._childs[0] || null
	}
	set id(id) {
		this._attr.id = id
	}
	get ownerDocument() {
		return global.document
	}
	appendChild(elem) {
		elem.parentNode = this
		this._childs.push(elem)
		return elem
	}
	querySelector(q) {
		let m = /#([-\w]+)|\[id="([-\w]+)"\]/.exec(q)
		if (m) {
			let id = m[1]||m[2]
			return ids[id] || null
		}
		if (q==":first-child")
			return this._childs[0] || null
		throw new Error('unknown selector '+q)
	}
	removeChild(elem) {
		let i = this._childs.indexOf(elem)
		if (i==-1)
			throw new Error('removeChild node was not child of parent')
		this._childs.splice(i, 1)
		elem._parent = null
		return elem
	}
	insertBefore(elem, ref) {
		if (ref==null)
			return this.appendChild(elem)
//		if (elem.tagName=='style')
//			console.log('style?', ref)
		let i = this._childs.indexOf(ref)
		if (i==-1)
			throw new Error('insertBefore reference node was not child of parent')
		this._childs.splice(i, 0, elem)
		elem._parent = this //bad
		return elem
	}
	getBBox() {
		//console.log('bbox :(', this.tagName, this._childs.length)
		let h = "<svg>"+this.outerHTML+"</svg>"
		let svg2 = child_process.execSync('rsvg-convert --format=svg', {input: h})
		let s = /viewBox="(\d+) (\d+) (\d+) (\d+)"/.exec(svg2)
		//console.log(h+"\n\n", [...s])
		let x = this._attr.x || +s[1]
		let y = this._attr.y || +s[2]
		if (s)
			return {x, y, width:+s[3], height:+s[4]}
		throw new Error('svg bbox render failed '+ svg2)
	}
	querySelectorAll(q) {
		let out = []
		if (q.startsWith('foreignobject '))
			return out
		if (/[.][-\w]+/.test(q)) {
			out = this.class_get(q.slice(1))
		} else
			throw new Error('unknown selector '+q)
		return out
	}
	class_get(cls) {
		let out = []
		for (let c of this._childs) {
			if (c._attr.class===cls)
				out.push(c)
			out.push(...c.class_get(cls))
		}
		return out
	}
	addEventListener() {
	}
	get outerHTML() {
		let html = "<"+this.tagName
		for (let x in this._attr) {
			html += ` ${x}='${String(this._attr[x]).replace(/'/g, '&quot;')}'`
		}
		let s = this.style.toString()
		if (s)
			html += ` style='${s.replace(/'/g, '&quot;')}'`
		html += ">"
		for (let c of this._childs) {
			html += c.outerHTML
		}
		html += this.innerHTML
		html += "</"+this.tagName+">"
		return html
	}
}
let gd = new Element('div')
gd.setAttribute('id', 'graphDiv')
let body = new Element('body')

global.document = {
	querySelectorAll(q) {
		//console.log("QSA:"+q+".")
		let m = /#([-\w]+) [.]([-\w]+)/.exec(q)
		if (m && ids[m[1]]) {
			return ids[m[1]].class_get(m[2])
		}
		if (/#[-\w]+/.test(q)) {
			let e = ids[q.slice(1)]
			return e ? [e] : []
		}
		throw new Error('unknown selector '+q)
	},
	querySelector(q) {
		if (q=='body')
			return body
		let m = /#([-\w]+)|\[id="([-\w]+)"\]/.exec(q)
		if (m) {
			let id = m[1]||m[2]
			return ids[id] || null
		}
		throw new Error('unknown selector '+q)
		return null
	},
	getElementById(id) {
		return ids[id] || null
	},
	createElementNS(uri, name) {
		return new Element(name, uri)
	},
	createElement(name) {
		return new Element(name)
	},
}
global.window = {
	addEventListener() {}
}
let mermaid = require('./mermaid.js')
let graph = `sequenceDiagram
    Alice->John: Hello John, how are you?
    loop Every minute
        John-->Alice: Great!
    end`

mermaid.mermaidAPI.initialize({
	securityLevel: 'loose'
})
//console.log(mermaid.mermaidAPI)
mermaid.mermaidAPI.render('graphDiv', graph, (a)=>{
	//console.log("\e[41mDONE", a)
	//console.log(gd.outerHTML)
	console.log(ids.graphDiv.outerHTML)
})
