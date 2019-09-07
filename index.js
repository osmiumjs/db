const tools = require('osmium-tools');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const sequelizeUtils = require('sequelize/lib/utils');
const DataTypeTIMESTAMP = require('./dataTypes/timestamp');
const BigNumber = require('bignumber.js');

const Sugar = require('sugar');
require('sugar-inflections');
Sugar.extend();

function filterName(what) {
	if (!tools.isString(what)) return what;
	what = what.trim().split('=')[0].split('@')[0].remove('*');
	return what[0] === '>' || what[0] === '<'
	       ? what.last(what.length - (what[1] === '<') - 1)
	       : what;
}

function OsmiumDBError(message, data) {
	this.message = message;
	this.data = data;
}

class DB extends Sequelize {
	constructor(dbName = 'osmiumapp', user = 'osmiumapp', password = 'masterkey', host = 'localhost', port = 5432, dialect = 'postgres', logging = false, options = {}) {
		options = Object.assign({dialect, host, logging, port}, tools.isObject(host) ? host : options, options);
		super(dbName, user, password, options);

		this._options = options;
		this.Sequelize = Sequelize;
		this.Op = Op;

		this.sequelizeUtils = sequelizeUtils;
		this.models = {};

		if (options.dialect.toLowerCase() === 'postgres') {
			this.PG = require('pg');
			this.PG.types.setTypeParser(1114, str => str);

			DataTypeTIMESTAMP(Sequelize);
		}

		this.DataTypes = Sequelize.DataTypes;
		tools.iterateKeys(Sequelize.DataTypes, (name) => this[name] = name.toLowerCase());
	}

	pluralize(what) {
		return this.sequelizeUtils.uppercaseFirst(this.sequelizeUtils.pluralize(what));
	}

	singularize(what) {
		return this.sequelizeUtils.uppercaseFirst(this.sequelizeUtils.singularize(what));
	}

	/**
	 * Connect tables (associations)
	 * @param from - connect what
	 * @param to - connect to
	 * @param hasMany - flag for hasMany
	 * @param belongsToMany - flag for belongsToMany
	 * @param mountAs - mount as name
	 * @param fkName - foreignKey name
	 * @param mountAsPk - modunt ad primary key
	 */
	link(from, to, hasMany, belongsToMany, mountAs, fkName, mountAsPk = false) {
		const addMtM = (a, b, through) => {
			this.models[a].belongsToMany(this.models[b], through);
			(this.models[a].mtmThrough = this.models[a].mtmThrough || {})[b] = through;
		};

		if (belongsToMany) {
			const through = {through: `${to}@${from}`};
			addMtM(from, to, through);
			addMtM(to, from, through);
		}

		const options = {};

		if (mountAs) {
			let allowNull = mountAs.indexOf('!') === -1;
			mountAs = mountAs.remove('!').trim();

			Object.assign(options, {
				foreignKey: {
					name      : fkName ? fkName : `${mountAs.singularize()}Id`,
					primaryKey: mountAsPk,
					allowNull
				},
				as        : mountAs
			});
		}

		if (!this.models[from] || !this.models[to]) {
			throw new OsmiumDBError('Can\'t find model for link', {to, from, models: Object.keys(this.models), mountAs, fkName});
		}
		console.log('>>>', {to, from, models: Object.keys(this.models), mountAs, fkName});

		const fkOptions = mountAs ? {foreignKey: fkName ? fkName : `${mountAs.singularize()}Id`} : fkName ? {foreignKey: fkName} : {};
		this.models[to][hasMany ? 'hasMany' : 'hasOne'](this.models[from], fkOptions);
		this.models[from].belongsTo(this.models[to], options);
	};

	processRelations(schema, parent = false) {
		if (!tools.isObject(schema) || parent === '#') return;

		tools.iterateKeys(schema, (name, out) => {
			if (parent) {
				name = name.split('=');
				const fkName = name[1] ? name[1] : false;
				name = name[0];

				name = name.split('@');
				const mountTo = (name.length > 1) ? name[1] : false;
				name = name[0];

				const asPk = name[1] === '*';

				if (name[0] === '>') this.link(filterName(name), filterName(parent), true, name[1] === '<', mountTo, fkName, asPk);
				if (name[0] === '<') this.link(filterName(parent), filterName(name), true, name[1] === '>', mountTo, fkName, asPk);
			}
			this.processRelations(out, name);
		});
	};

	registerModel(name, model) {
		const genMtmFn = (cmd, singularize = false) => function (target, p1 = {}) {
			return this[`${cmd}${this[singularize ? 'singularize' : 'pluralize'](target)}`](p1);
		};
		const strcut = {};
		let options = {
			freezeTableName: !!this._options.freezeTableName,
			timestamps     : !this._options.disableTimestamps
		};
		name = filterName(name);
		//let useBignum = [];

		tools.iterate(model, (val, key) => {
			if (key[0] === '#') options = val;
			if (tools.isObject(val) && val.key) val = val.key;
			if (!tools.isString(val)) return;

			let notNull = val.indexOf('!') !== -1;
			val = val.remove('!').split('^');

			let type = this.Sequelize[val[0].toUpperCase()];

			if (!type) return;
			if (val.length > 1) type = type(...val[1].split(','));
			type = {type};

			if (notNull) type.allowNull = false;

			if (key[0] === '*') {
				key = key.substring(1);
				Object.assign(type, {
					primaryKey   : true,
					autoIncrement: type === this.Sequelize.DataTypes.INTEGER
				});
			}
			//if (type.type.key === 'BIGINT') useBignum.push(key);

			strcut[key] = type;
		});

		/*if (useBignum) {
			options.hooks = {
				afterFind(mdl) {
					tools.iterate(useBignum, (val) => {
						mdl.dataValues[val] = new BigNumber(mdl.dataValues[val]);
					});
				}
			};
		}*/

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

		const defList = ['id'];
		tools.iterateKeys(list || defList, (name) => { delete what[name]; });

		return what;
	};
}

module.exports = DB;
