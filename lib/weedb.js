var handler = (db, method, arg) => {
	return new Promise((go, stop) => {
		db[method](arg, (e, result) => {
			if (e) { stop(e); return; };
			go(result);
		});
	});
};

class Wee {
	constructor(db) {
		this.db = db;
	}

	save(what) { var s = this; return handler(s.db, 'save', what); }
	insert(what) { var s = this; return handler(s.db, 'insert', what); }
	find(what) { var s = this; return handler(s.db, 'find', what); }
	findOne(what) { var s = this; return handler(s.db, 'findOne', what); }
	remove(what) { var s = this;
		return new Promise((go, stop) => {
			s.db.remove(what, options, (e, num_removed) => {
				if (e) { stop(e); return; }
				go(num_removed);
			});
		});
	}
}

module.exports = Wee;