const oTools = require('osmium-tools');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const sequelizeUtils = require('sequelize/lib/utils');
const DataTypeTIMESTAMP = require('./dataTypes/timestamp');
const BigNumber = require('bignumber.js');

//Inject SugarJS
const Sugar = require('sugar');
require('sugar-inflections');
Sugar.extend();

//Filter table name from name mods
function filterName(what) {
	if (!oTools.isString(what)) return what;

	const isMtM = what.substr(0, 2) === '><' || what.substr(0, 2) === '<>';
	what = what.trim().split('=')[0].split('@')[0].remove('*');
	return what[0] === '>' || what[0] === '<'
	       ? isMtM
	         ? what.substr(2)
	         : what.substr(1)
	       : what;
}

function OsmiumDBError(message, data) {
	this.message = message;
	this.data = data;
}

//Basic class
class DB extends Sequelize {
	constructor(dbName = 'osmiumapp', user = 'osmiumapp', password = 'masterkey', host = 'localhost', port = 5432, dialect = 'postgres', logging = false, options = {}) {
		//Define options
		options = Object.assign({
			dialect,
			host           : oTools.isObject(host) ? 'localhost' : host,
			freezeTableName: true,
			logging,
			port
		}, oTools.isObject(host) ? host : options, options);

		//Call sequelize constructor
		super(dbName, user, password, options);

		//Basic properties
		this._options = options;
		this.Sequelize = Sequelize;
		this.Op = Op;
		this.sequelizeUtils = sequelizeUtils;

		//Models storage
		this.models = {};
		this.mtms = {};

		//Add timestamp settings
		if (options.dialect.toLowerCase() === 'postgres') {
			this.PG = require('pg');
			this.PG.types.setTypeParser(1114, value => (typeof value === 'string' || typeof value === 'number') ? new Date(value) : value);

			DataTypeTIMESTAMP(Sequelize);
		}

		//Map DataTypes
		this.DataTypes = Sequelize.DataTypes;
		oTools.iterateKeys(Sequelize.DataTypes, (name) => this[name] = name.toLowerCase());
	}

	//Pluralize function
	pluralize(what) {
		return this.sequelizeUtils.uppercaseFirst(this.sequelizeUtils.pluralize(what));
	}

	//Singularize function
	singularize(what) {
		return this.sequelizeUtils.uppercaseFirst(this.sequelizeUtils.singularize(what));
	}

	//Link Many to Mant relations
	linkMtM(from, to, _, as) {
		const addMtM = (a, b) => {
			const options = Object();
			options.through = `${to}@${from}${as ? '#' + as : ''}`;
			options.foreignKey = `${a.singularize()}Id`;

			if (as) options.as = as;

			this.mtms[from] = this.mtms[from] || {};
			this.mtms[from][as ? as : to] = {through: options.through, opposite: to};

			this.mtms[to] = this.mtms[to] || {};
			this.mtms[to][as ? as : from] = {through: options.through, opposite: from};

			this.models[a].belongsToMany(this.models[b], options);
			(this.models[a].mtmThrough = this.models[a].mtmThrough || {})[b] = options;
		};

		addMtM(from, to, as);
		addMtM(to, from, as);
	}

	/**
	 * Connect tables (associations)
	 * @param from - connect what
	 * @param to - connect to
	 * @param hasMany - flag for hasMany
	 * @param mountAs - mount as name
	 * @param fkName - foreignKey name
	 * @param mountAsPk - modunt ad primary key
	 */
	link(from, to, hasMany, mountAs, fkName, mountAsPk = false) {
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

		const fkOptions = mountAs ? {foreignKey: fkName ? fkName : `${mountAs.singularize()}Id`} : fkName ? {foreignKey: fkName} : {};
		this.models[to][hasMany ? 'hasMany' : 'hasOne'](this.models[from], fkOptions);
		this.models[from].belongsTo(this.models[to], options);
	};

	processRelations(schema, parent = false) {
		if (!oTools.isObject(schema) || parent === '#') return;

		oTools.iterateKeys(schema, (name, out) => {
			if (parent) {
				name = name.split('=');
				const fkName = name[1] ? name[1] : false;
				name = name[0];

				name = name.split('@');
				const mountTo = (name.length > 1) ? name[1] : false;
				name = name[0];

				const asPk = name[1] === '*';

				const isMtM = name.substr(0, 2) === '><' || name.substr(0, 2) === '<>';
				if (name[0] === '>') this[isMtM ? 'linkMtM' : 'link'](filterName(name), filterName(parent), true, mountTo, fkName, asPk);
				if (name[0] === '<') this[isMtM ? 'linkMtM' : 'link'](filterName(parent), filterName(name), true, mountTo, fkName, asPk);
			}

			this.processRelations(out, name);
		});
	};

	registerModel(name, model) {
		const struct = {};
		let options = {};
		name = filterName(name);

		const usedCustomTypes = {};
		const customTypes = {
			'NUMBER'   : ['BIGINT', (v) => v.toString(), (v) => parseInt(v)],
			'BIGNUMBER': ['BIGINT', (v) => v.toString(), (v) => new BigNumber(v)],
		};

		oTools.iterate(model, (val, key) => {
			let def = false;

			if (oTools.isArray(val)) {
				if (val[1]) def = val[1];
				if (val[2]) def = val[2];
				val = val[0];
			}

			if (key[0] === '#' && oTools.isObject(val)) {
				Object.assign(options, val);
				return;
			}

			if (oTools.isObject(val) && val.key) val = val.key;
			if (!oTools.isString(val)) return;

			let notNull = val.indexOf('!') !== -1;
			let unique = val.indexOf('~') !== -1;

			val = val.remove('!').remove('~').split('^');

			if (customTypes[val[0].toUpperCase()]) {
				const typeDef = customTypes[val[0].toUpperCase()];
				usedCustomTypes[key] = {
					type: val[0].toUpperCase(),
					args: val[1] ? val[1].split(',') : false
				};
				val[0] = typeDef[0];
			}

			let type = this.Sequelize[val[0].toUpperCase()];
			if (!type) return;

			if (val.length > 1) type = type(...val[1].split(','));

			const typeObj = {type};

			if (notNull) typeObj.allowNull = false;
			if (unique) typeObj.unique = true;

			if (key[0] === '*') {
				key = key.substring(1);
				Object.assign(typeObj, {
					primaryKey   : true,
					autoIncrement: typeObj.type === this.Sequelize.DataTypes.INTEGER
				});
			}

			if (def) typeObj.defaultValue = def;

			struct[key] = typeObj;
		});

		options.hooks = {
			beforeValidate(mdl) {
				oTools.iterate(usedCustomTypes, (ct, ctName) => {
					if (!mdl.dataValues[ctName]) return;
					if (customTypes[ct.type][1]) mdl.dataValues[ctName] = customTypes[ct.type][1](mdl.dataValues[ctName]);
				});
			},
			afterFind(mdl) {
				oTools.iterate(usedCustomTypes, (ct, ctName) => {
					if (!mdl.dataValues[ctName]) return;
					if (customTypes[ct.type][2]) mdl.dataValues[ctName] = customTypes[ct.type][2](mdl.dataValues[ctName]);
				});
			}
		};


		this.models[name] = this.define(name, struct, options);
		const self = this;

		function getMtMmodel(from, name) {
			if (!self.mtms[from][name]) return false;
			return self.models[self.mtms[from][name].through];
		}

		function mtmIds(from, name, to) {
			return {
				[`${from.constructor.name.singularize()}Id`]                          : from.id,
				[`${self.mtms[from.constructor.name][name].opposite.singularize()}Id`]: to.id,
			};
		}

		Object.assign(this.models[name].prototype, {
			async mtmAdd(name, to) {
				const mdl = getMtMmodel(this.constructor.name, name);
				if (!mdl) return false;
				await oTools.iterate(oTools.toArray(to), async (el) => await mdl.create(mtmIds(this, name, el)));
			},
			async mtmRemove(name, to) {
				const mdl = getMtMmodel(this.constructor.name, name);
				if (!mdl) return false;
				await oTools.iterate(oTools.toArray(to), async (el) => await mdl.destroy({where: mtmIds(this, name, el)}));
			},
			async mtmGet(name) {
				return (await self.models[this.constructor.name].findOne({where: {id: this.id}, include: [name]})).dataValues[name];
			}
		});
	};

	defineSchema(schema, parent = false) {
		if (parent) this.registerModel(parent, Object.clone(schema, {deep: true}));
		oTools.iterateKeys(schema, (name, subSchema) => {
			if (name[0] !== '#' && oTools.isObject(subSchema)) this.defineSchema(Object.clone(subSchema), name);
		});
		if (!parent) this.processRelations(schema);
	};

	getValues(what, retVal) {
		const defValues = (what, def = false) =>
			what.dataValues
			? retVal
			  ? oTools.isObject(retVal)
			    ? Object.assign(what.get({plain: true}), retVal)
			    : what.get({plain: true})[retVal]
			  : what.get({plain: true})
			: def;

		if (oTools.isObject(what)) return defValues(what);
		if (oTools.isArray(what)) return oTools.iterate(what, (row) => defValues(row), []);
	};

	cleanParams(what, list) {
		if (!oTools.isObject(what)) return what;

		const defList = ['id'];
		oTools.iterateKeys(list || defList, (name) => { delete what[name]; });

		return what;
	};
}

class DBSQLITE extends DB {
	constructor(fName = 'main.db', dbName = 'db', logger = false, options) {
		super(dbName, '', '', '', '', 'sqlite', logger, Object.assign({storage: fName}, options));
	}
}

module.exports = {DB, DBSQLITE, Sequelize, BigNumber, Op, Sugar, oTools, sequelizeUtils};
