import fs from "node:fs";
import path from "node:path";
const lchownSync = (t, n, r) => {
	try {
		return fs.lchownSync(t, n, r);
	} catch (e) {
		if (e?.code !== `ENOENT`) throw e;
	}
}, chown = (t, n, r, i) => {
	fs.lchown(t, n, r, (e) => {
		i(e && e?.code !== `ENOENT` ? e : null);
	});
}, chownrKid = (e, n, i, o, s) => {
	n.isDirectory() ? chownr(path.resolve(e, n.name), i, o, (a) => {
		if (a) return s(a);
		chown(path.resolve(e, n.name), i, o, s);
	}) : chown(path.resolve(e, n.name), i, o, s);
}, chownr = (t, n, a, o) => {
	fs.readdir(t, { withFileTypes: !0 }, (e, s) => {
		if (e) {
			if (e.code === `ENOENT`) return o();
			if (e.code !== `ENOTDIR` && e.code !== `ENOTSUP`) return o(e);
		}
		if (e || !s.length) return chown(t, n, a, o);
		let c = s.length, l = null, u = (e) => {
			if (!l) {
				if (e) return o(l = e);
				if (--c === 0) return chown(t, n, a, o);
			}
		};
		for (let e of s) chownrKid(t, e, n, a, u);
	});
}, chownrKidSync = (e, r, i, a) => {
	r.isDirectory() && chownrSync(path.resolve(e, r.name), i, a), lchownSync(path.resolve(e, r.name), i, a);
}, chownrSync = (t, r, i) => {
	let a;
	try {
		a = fs.readdirSync(t, { withFileTypes: !0 });
	} catch (e) {
		let a = e;
		if (a?.code === `ENOENT`) return;
		if (a?.code === `ENOTDIR` || a?.code === `ENOTSUP`) return lchownSync(t, r, i);
		throw a;
	}
	for (let e of a) chownrKidSync(t, e, r, i);
	return lchownSync(t, r, i);
};
export { chownrSync as n, chownr as t };
