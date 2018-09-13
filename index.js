const tools = require('osmium-tools');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const sequelizeUtils = require('sequelize/lib/utils');

const Sugar = require('sugar');
require('sugar-inflections');
Sugar.extend();

function filterName(what) {
	if (!tools.isString(what)) return what;
	what = what.trim();
	return what[0] === '>' || what[0] === '<'
		? what.last(what.length - (what[1] === '<') - 1)
		: what;
}

function crudFactory(db) {
	const crud = {};
	Object.assign(crud, {
		createRaw: async (model, what) => await db.models[model].create(db.cleanParams(what, [])),
		create   : async (model, what) => (await crud.createRaw(model, what)).dataValues,
		readRaw  : async (model, where, first) => {
			where = tools.isObject(where) ? where : {};
			let options = where['#'] || {};
			delete where['#'];
			options.where = options.where || where;
			return await db.models[model][first ? 'find' : 'findAll'](options);
		},
		read     : async (model, where = {}, first, retVal) =>
			db.getValues(await crud.readRaw(model, where._removed
				? where
				: Object.assign(where, this.vRemove ? {_removed: {[this.Op.not]: true}} : {}), first), retVal),
		updateRaw: async (model, what, where) => await db.models[model].update(what, {
			where: where ? where : {id: what.id}
		}),
		update   : async (model, what, where) =>
			!!(await crud.updateRaw(model, db.cleanParams(what), where))[0],
		delete   : async (model, id) => !!(await db.models[model].update(this.vRemove ? {_removed: true} : {}, {where: {id: id}}))[0],
		destroy  : async (model, id) => (await db.models[model].destroy({where: {id: id}})),
		count    : async (model, where = {}, options = {}) =>
			await db.models[model].count(options ? options : where ? {where: where} : {})
	});
	return crud;
}

Sequelize.JSONTEXT = (col_name) => {
	return {
		type: Sequelize.TEXT,
		get : function () {
			return JSON.parse(this.getDataValue(col_name));
		},
		set : function (obj) {
			return this.setDataValue(col_name, JSON.stringify(obj));
		}
	};
};

class DB extends Sequelize {
	constructor(dbName, user, password, host, type, log) {
		super(dbName || 'osmiumapp',
			user || 'osmiumapp',
			password || 'masterkey', {
				dialect         : type || 'postgres',
				host            : host || 'localhost',
				logging         : log || false,
				operatorsAliases: false
			}
		);
		this.Sequelize = Sequelize;
		this.Op = Op;
		this.sequelizeUtils = sequelizeUtils;
		this.models = {};
		this.crud = crudFactory(this);
		this.vRemove = true;
	}

	disableVirtualRemove() {
		this.vRemove = false;
	}

	pluralize(what) {
		return this.sequelizeUtils.uppercaseFirst(this.sequelizeUtils.pluralize(what));
	}

	singularize(what) {
		return this.sequelizeUtils.uppercaseFirst(this.sequelizeUtils.singularize(what));
	}

	/**
	 * connect tables
	 * @param from - connect what
	 * @param to - connect to
	 * @param hasMany
	 * @param belongsToMany
	 * @param mountAs
	 */
	link(from, to, hasMany, belongsToMany, mountAs) {
		let addMtM = (a, b, through) => {
			this.models[a].belongsToMany(this.models[b], through);
			(this.models[a].mtmThrough = this.models[a].mtmThrough || {})[b] = through;
		};
		if (!belongsToMany) {
			let options = {};
			if (mountAs) options = {foreignKey: `${mountAs.singularize()}Id`, as: mountAs};
			this.models[to][hasMany ? 'hasMany' : 'hasOne'](this.models[from], mountAs ? {foreignKey: `${mountAs.singularize()}Id`} : {});
			this.models[from].belongsTo(this.models[to], options);
		} else {
			let through = {through: `${to}@${from}`};
			addMtM(from, to, through);
			addMtM(to, from, through);
		}
	};

	processRelations(schema, parent = false) {
		if (!tools.isObject(schema)) return;
		if (parent === '#') return;
		tools.iterateKeys(schema, (name, out) => {
			if (parent) {
				name = name.split('@');
				let mountTo = (name.length > 1) ? name[1] : false;
				name = name[0];
				if (name[0] === '>') {
					this.link(filterName(name), filterName(parent), true, name[1] === '<', mountTo);
				}
				if (name[0] === '<') {
					this.link(filterName(parent), filterName(name), true, name[1] === '>', mountTo);
				}
			}
			this.processRelations(out, name);
		});
	};

	registerModel(name, model) {
		let genMtmFn = (cmd, singularize = false) => function (target, p1 = {}) {
			return this[`${cmd}${this[singularize ? 'singularize' : 'pluralize'](target)}`](p1);
		};
		let strcut = {};
		let options = {};
		name = filterName(name);
		tools.iterate(model, (val, key) => {
			if (key[0] === '#') options = val;
			if (!tools.isString(val)) return;
			let type = this.Sequelize[val.toUpperCase()];
			if (!type) return;
			strcut[key] = type;
		});
		if (this.vRemove) strcut._removed = 'boolean';
		this.models[name] = this.define(name, strcut, options);
		Object.assign(this.models[name].prototype, {
			mtmGet       : genMtmFn('get'),
			mtmSet       : genMtmFn('set'),
			mtmAdd       : genMtmFn('add', true),
			mtmAddMany   : genMtmFn('add'),
			mtmRemove    : genMtmFn('remove', true),
			mtmRemoveMany: genMtmFn('remove'),
			mtmHas       : genMtmFn('has', true),
			mtmHasMany   : genMtmFn('has'),
			mtmCount     : genMtmFn('count')
		});
	};

	defineSchema(schema, parent = false) {
		if (parent) this.registerModel(parent, Object.clone(schema, {deep: true}));
		tools.iterateKeys(schema, (name, subSchema) => {
			if (name[0] !== '#' && tools.isObject(subSchema)) this.defineSchema(Object.clone(subSchema), name);
		});
		if (!parent) this.processRelations(schema);
	};

	getValues(what, retVal) {
		const defValues = (what, def = false) =>
			what.dataValues
				? retVal
				? tools.isObject(retVal)
					? Object.assign(what.get({plain: true}), retVal)
					: what.get({plain: true})[retVal]
				: what.get({plain: true})
				: def;

		if (tools.isObject(what)) return defValues(what);
		if (tools.isArray(what)) return tools.iterate(what, (row) => defValues(row), []);
	};

	cleanParams(what, list) {
		if (!tools.isObject(what)) return what;
		let defList = ['id'];
		tools.iterateKeys(list || defList, (name) => { delete what[name]; });
		return what;
	};
}

module.exports = DB;