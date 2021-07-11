const Sequelize = require('sequelize');
const {DataTypes, Op} = Sequelize;

const nTools = require('@osmium/tools');
const {cryptTools} = require('@osmium/crypt');

const sequelizeUtils = require('sequelize/lib/utils');
const BigNumber = require('bignumber.js');
const fs = require('mz/fs');
const PG = require('pg');

//Inject SugarJS
/** @type {sugarjs.Sugar} */
const Sugar = require('sugar');
require('sugar-inflections');
Sugar.extend();

/** @typedef {import('sequelize/types').Model} Model */
/** @typedef {import('sequelize/types').ModelCtor} ModelCtor */

/** @typedef {{dataValues:{[string]: any}}} DataValues */

/**
 * Filter table name from name mods
 * @param {String|boolean} what - Table name
 * @returns {String} result
 */
function filterName(what) {
	if (!nTools.isString(what)) return what;

	const isMtM = what.substr(0, 2) === '><' || what.substr(0, 2) === '<>';
	what = what.trim().split('=')[0].split('@')[0].remove('*');

	return what[0] === '>' || what[0] === '<' ? isMtM ? what.substr(2) : what.substr(1) : what;
}

/**
 * Error
 * @param message
 * @param data
 * @constructor
 */
function DBError(message, data) {
	this.message = message;
	this.data = data;
}

/**
 * @class {DB & Sequelize.Sequelize & Sequelize}
 */
class DB extends Sequelize.Sequelize {
	/**
	 * @constructor
	 * @param {String} [dbName='app'] - DB name
	 * @param {String} [user='app'] - DB user
	 * @param {String} [password='masterkey'] - DB password
	 * @param {String|Object} [host='localhost'] - Hostname or options
	 * @param {Number} [port=5432] - DB port
	 * @param {String} [dialect='postgres'] - DB dialice
	 * @param {Boolean} [logging=false] - Enable SQL logging
	 * @param {Object} [options={}] - Options
	 * @return {DB & Sequelize.Sequelize}
	 */
	static createInstance(dbName = 'app', user = 'app', password = 'masterkey', host = 'localhost', port = 5432, dialect = 'postgres', logging = false, options = {}) {
		return new DB(dbName, user, password, host, port, dialect, logging, options);
	}

	/**
	 * @type {{}}
	 * @private
	 */
	_options;
	/** @type {Op} */
	Op = Op;
	/** @private */
	struct;
	/** @type {{QueryTypes, Utils, Op, IndexHints, Optional: Optional, validator, Deferrable, Error, TableHints, DataTypes, Sequelize: Sequelize, SyncAlterOptions: SyncAlterOptions, QueryOptionsTransactionRequired: QueryOptionsTransactionRequired, Config: Config, json(conditionsOrPath: (string | object), value?: (string | number | boolean)): Json, or(...args: WhereOperators | WhereAttributeHash<any> | Where[]): OrOperator<any>, PoolOptions: PoolOptions, DefaultSetOptions: DefaultSetOptions, col(col: string): Col, AttributeType: AttributeType, SyncOptions: SyncOptions, OperatorsAliases: OperatorsAliases, cast(val: unknown, type: string): Cast, fn(fn: string, ...args: unknown[]): Fn, RetryOptions: RetryOptions, Options: Options, ReplicationOptions: ReplicationOptions, literal(val: string): Literal, and(...args: WhereOperators | WhereAttributeHash<any> | Where[]): AndOperator<any>, LogicType: LogicType, Dialect: Dialect, where: {(attr: AttributeType, comparator: (string | symbol), logic: LogicType): Where, (attr: AttributeType, logic: LogicType): Where}, ConnectionOptions: ConnectionOptions, AddForeignKeyConstraintOptions: AddForeignKeyConstraintOptions, QueryInterfaceCreateTableOptions: QueryInterfaceCreateTableOptions, IndexMethod: IndexMethod, QueryOptions: QueryOptions, IndexType: IndexType, QueryOptionsWithForce: QueryOptionsWithForce, QueryOptionsWithWhere: QueryOptionsWithWhere, BindOrReplacements: BindOrReplacements, AddPrimaryKeyConstraintOptions: AddPrimaryKeyConstraintOptions, QueryInterfaceOptions: QueryInterfaceOptions, ColumnDescription: ColumnDescription, FieldMap: FieldMap, AddCheckConstraintOptions: AddCheckConstraintOptions, CollateCharsetOptions: CollateCharsetOptions, ColumnsDescription: ColumnsDescription, QueryOptionsWithType: QueryOptionsWithType, TableNameWithSchema: TableNameWithSchema, QueryInterfaceDropTableOptions: QueryInterfaceDropTableOptions, IndexesOptions: IndexesOptions, AddUniqueConstraintOptions: AddUniqueConstraintOptions, TableName: TableName, QueryInterfaceDropAllTablesOptions: QueryInterfaceDropAllTablesOptions, QueryInterfaceIndexOptions: QueryInterfaceIndexOptions, QueryInterface: QueryInterface, FunctionParam: FunctionParam, AddDefaultConstraintOptions: AddDefaultConstraintOptions, CreateDatabaseOptions: CreateDatabaseOptions, BaseConstraintOptions: BaseConstraintOptions, QueryOptionsWithModel: QueryOptionsWithModel, AddConstraintOptions: AddConstraintOptions, MediumIntegerDataTypeConstructor: MediumIntegerDataTypeConstructor, VirtualDataType: VirtualDataType, EnumDataTypeConstructor: EnumDataTypeConstructor, BlobSize: BlobSize, BlobDataTypeConstructor: BlobDataTypeConstructor, GeometryDataTypeOptions: GeometryDataTypeOptions, DecimalDataTypeOptions: DecimalDataTypeOptions, MACADDR: AbstractDataTypeConstructor, DataType: DataType, RangeDataTypeConstructor: RangeDataTypeConstructor, GEOGRAPHY: GeographyDataTypeConstructor, TIME: AbstractDataTypeConstructor, NumberDataType: NumberDataType, NumberDataTypeOptions: NumberDataTypeOptions, ArrayDataType: ArrayDataType, UUIDV4: AbstractDataTypeConstructor, CharDataTypeOptions: CharDataTypeOptions, RangeDataType: RangeDataType, DATE: DateDataTypeConstructor, ArrayDataTypeConstructor: ArrayDataTypeConstructor, DOUBLE: DoubleDataTypeConstructor, SmallIntegerDataType: SmallIntegerDataType, UUIDV1: AbstractDataTypeConstructor, FloatDataTypeOptions: FloatDataTypeOptions, RANGE: RangeDataTypeConstructor, HSTORE: AbstractDataTypeConstructor, TinyIntegerDataType: TinyIntegerDataType, BLOB: BlobDataTypeConstructor, CharDataTypeConstructor: CharDataTypeConstructor, RealDataTypeOptions: RealDataTypeOptions, DoubleDataType: DoubleDataType, VirtualDataTypeConstructor: VirtualDataTypeConstructor, DateDataTypeConstructor: DateDataTypeConstructor, TextLength: TextLength, UUID: AbstractDataTypeConstructor, StringDataTypeOptions: StringDataTypeOptions, JSON: AbstractDataTypeConstructor, EnumDataType: EnumDataType, DateOnlyDataType: DateOnlyDataType, GEOMETRY: GeometryDataTypeConstructor, DecimalDataType: DecimalDataType, DECIMAL: DecimalDataTypeConstructor, NumberDataTypeConstructor: NumberDataTypeConstructor, REAL: RealDataTypeConstructor, BlobDataTypeOptions: BlobDataTypeOptions, GeographyDataTypeOptions: GeographyDataTypeOptions, ABSTRACT: AbstractDataTypeConstructor, RealDataTypeConstructor: RealDataTypeConstructor, CharDataType: CharDataType, FloatDataType: FloatDataType, DateDataTypeOptions: DateDataTypeOptions, GeometryDataType: GeometryDataType, TinyIntegerDataTypeConstructor: TinyIntegerDataTypeConstructor, CHAR: CharDataTypeConstructor, StringDataTypeConstructor: StringDataTypeConstructor, CITEXT: AbstractDataTypeConstructor, ENUM: EnumDataTypeConstructor, NOW: AbstractDataTypeConstructor, DateDataType: DateDataType, IntegerDataTypeConstructor: IntegerDataTypeConstructor, TextDataTypeOptions: TextDataTypeOptions, StringDataType: StringDataType, INTEGER: IntegerDataTypeConstructor, GeometryDataTypeConstructor: GeometryDataTypeConstructor, RealDataType: RealDataType, MEDIUMINT: MediumIntegerDataTypeConstructor, AbstractDataTypeConstructor: AbstractDataTypeConstructor, RangeDataTypeOptions: RangeDataTypeOptions, NUMBER: NumberDataTypeConstructor, DateOnlyDataTypeConstructor: DateOnlyDataTypeConstructor, DATEONLY: DateOnlyDataTypeConstructor, DataTypeAbstract: DataTypeAbstract, AbstractDataType: AbstractDataType, BigIntDataType: BigIntDataType, DoubleDataTypeOptions: DoubleDataTypeOptions, INET: AbstractDataTypeConstructor, TextDataTypeConstructor: TextDataTypeConstructor, SMALLINT: SmallIntegerDataTypeConstructor, BOOLEAN: AbstractDataTypeConstructor, BIGINT: BigIntDataTypeConstructor, FloatDataTypeConstructor: FloatDataTypeConstructor, ArrayDataTypeOptions: ArrayDataTypeOptions, BigIntDataTypeConstructor: BigIntDataTypeConstructor, CIDR: AbstractDataTypeConstructor, TextDataType: TextDataType, MediumIntegerDataType: MediumIntegerDataType, JSONB: AbstractDataTypeConstructor, IntegerDataType: IntegerDataType, ARRAY: ArrayDataTypeConstructor, DoubleDataTypeConstructor: DoubleDataTypeConstructor, VIRTUAL: VirtualDataTypeConstructor, SmallIntegerDataTypeConstructor: SmallIntegerDataTypeConstructor, STRING: StringDataTypeConstructor, GeographyDataType: GeographyDataType, IntegerDataTypeOptions: IntegerDataTypeOptions, BlobDataType: BlobDataType, GeographyDataTypeConstructor: GeographyDataTypeConstructor, RangeableDataType: RangeableDataType, EnumDataTypeOptions: EnumDataTypeOptions, FLOAT: FloatDataTypeConstructor, DecimalDataTypeConstructor: DecimalDataTypeConstructor, TEXT: TextDataTypeConstructor, TINYINT: TinyIntegerDataTypeConstructor, AnyOperator: AnyOperator, Order: Order, SetOptions: SetOptions, Includeable: Includeable, AggregateOptions: AggregateOptions, InstanceUpdateOptions: InstanceUpdateOptions, WhereValue: WhereValue, AndOperator: AndOperator, Filterable: Filterable, WhereOptions: WhereOptions, Identifier: Identifier, OrOperator: OrOperator, ModelScopeOptions: ModelScopeOptions, Silent: Silent, BuildOptions: BuildOptions, ProjectionAlias: ProjectionAlias, OrderItem: OrderItem, BulkCreateOptions: BulkCreateOptions, RestoreOptions: RestoreOptions, CountOptions: CountOptions, InitOptions: InitOptions, IndexHintable: IndexHintable, FindAttributeOptions: FindAttributeOptions, SchemaOptions: SchemaOptions, TruncateOptions: TruncateOptions, InstanceDestroyOptions: InstanceDestroyOptions, Logging: Logging, IncrementDecrementOptions: IncrementDecrementOptions, ColumnOptions: ColumnOptions, Rangable: Rangable, Hookable: Hookable, Paranoid: Paranoid, ModelDefined: ModelDefined, Projectable: Projectable, ModelStatic: ModelStatic, DropOptions: DropOptions, IncludeThroughOptions: IncludeThroughOptions, ModelGetterOptions: ModelGetterOptions, ModelType: ModelType, ModelAttributeColumnOptions: ModelAttributeColumnOptions, CreateOptions: CreateOptions, ModelNameOptions: ModelNameOptions, ModelOptions: ModelOptions, ModelAttributes: ModelAttributes, CountWithOptions: CountWithOptions, ModelValidateOptions: ModelValidateOptions, ModelIndexesOptions: ModelIndexesOptions, Poolable: Poolable, FindOrCreateOptions: FindOrCreateOptions, AddScopeOptions: AddScopeOptions, InstanceRestoreOptions: InstanceRestoreOptions, FindOptions: FindOptions, AllOperator: AllOperator, GroupOption: GroupOption, SaveOptions: SaveOptions, DestroyOptions: DestroyOptions, NonNullFindOptions: NonNullFindOptions, IncludeOptions: IncludeOptions, ModelCtor: ModelCtor, ModelSetterOptions: ModelSetterOptions, SearchPathable: SearchPathable, UpdateOptions: UpdateOptions, IndexHint: IndexHint, WhereAttributeHash: WhereAttributeHash, WhereGeometryOptions: WhereGeometryOptions, Model: Model, Transactionable: Transactionable, WhereOperators: WhereOperators, ModelAttributeColumnReferencesOptions: ModelAttributeColumnReferencesOptions, UpsertOptions: UpsertOptions, FindAndCountOptions: FindAndCountOptions, ScopeOptions: ScopeOptions, IncrementDecrementOptionsWithBy: IncrementDecrementOptionsWithBy, Transaction: Transaction, LOCK: LOCK, TransactionOptions: TransactionOptions, Association: Association, AssociationOptions: AssociationOptions, AssociationScope: AssociationScope, MultiAssociationAccessors: MultiAssociationAccessors, SingleAssociationAccessors: SingleAssociationAccessors, ForeignKeyOptions: ForeignKeyOptions, ManyToManyOptions: ManyToManyOptions, BelongsTo: BelongsTo, BelongsToCreateAssociationMixinOptions: BelongsToCreateAssociationMixinOptions, BelongsToCreateAssociationMixin: BelongsToCreateAssociationMixin, BelongsToGetAssociationMixin: BelongsToGetAssociationMixin, BelongsToGetAssociationMixinOptions: BelongsToGetAssociationMixinOptions, BelongsToOptions: BelongsToOptions, BelongsToSetAssociationMixinOptions: BelongsToSetAssociationMixinOptions, BelongsToSetAssociationMixin: BelongsToSetAssociationMixin, HasOneGetAssociationMixinOptions: HasOneGetAssociationMixinOptions, HasOne: HasOne, HasOneSetAssociationMixinOptions: HasOneSetAssociationMixinOptions, HasOneOptions: HasOneOptions, HasOneCreateAssociationMixin: HasOneCreateAssociationMixin, HasOneSetAssociationMixin: HasOneSetAssociationMixin, HasOneGetAssociationMixin: HasOneGetAssociationMixin, HasOneCreateAssociationMixinOptions: HasOneCreateAssociationMixinOptions, HasManyCountAssociationsMixin: HasManyCountAssociationsMixin, HasManyCreateAssociationMixin: HasManyCreateAssociationMixin, HasManySetAssociationsMixin: HasManySetAssociationsMixin, HasManyGetAssociationsMixin: HasManyGetAssociationsMixin, HasManyAddAssociationMixinOptions: HasManyAddAssociationMixinOptions, HasManyHasAssociationMixin: HasManyHasAssociationMixin, HasMany: HasMany, HasManyOptions: HasManyOptions, HasManyHasAssociationMixinOptions: HasManyHasAssociationMixinOptions, HasManyCreateAssociationMixinOptions: HasManyCreateAssociationMixinOptions, HasManySetAssociationsMixinOptions: HasManySetAssociationsMixinOptions, HasManyGetAssociationsMixinOptions: HasManyGetAssociationsMixinOptions, HasManyRemoveAssociationMixin: HasManyRemoveAssociationMixin, HasManyRemoveAssociationMixinOptions: HasManyRemoveAssociationMixinOptions, HasManyAddAssociationsMixin: HasManyAddAssociationsMixin, HasManyCountAssociationsMixinOptions: HasManyCountAssociationsMixinOptions, HasManyRemoveAssociationsMixin: HasManyRemoveAssociationsMixin, HasManyHasAssociationsMixinOptions: HasManyHasAssociationsMixinOptions, HasManyRemoveAssociationsMixinOptions: HasManyRemoveAssociationsMixinOptions, HasManyAddAssociationMixin: HasManyAddAssociationMixin, HasManyAddAssociationsMixinOptions: HasManyAddAssociationsMixinOptions, HasManyHasAssociationsMixin: HasManyHasAssociationsMixin, BelongsToMany: BelongsToMany, BelongsToManyRemoveAssociationsMixin: BelongsToManyRemoveAssociationsMixin, BelongsToManyOptions: BelongsToManyOptions, BelongsToManyAddAssociationMixinOptions: BelongsToManyAddAssociationMixinOptions, BelongsToManyCreateAssociationMixin: BelongsToManyCreateAssociationMixin, BelongsToManyRemoveAssociationsMixinOptions: BelongsToManyRemoveAssociationsMixinOptions, BelongsToManyAddAssociationMixin: BelongsToManyAddAssociationMixin, BelongsToManyAddAssociationsMixinOptions: BelongsToManyAddAssociationsMixinOptions, BelongsToManyAddAssociationsMixin: BelongsToManyAddAssociationsMixin, BelongsToManyCreateAssociationMixinOptions: BelongsToManyCreateAssociationMixinOptions, BelongsToManyGetAssociationsMixin: BelongsToManyGetAssociationsMixin, ThroughOptions: ThroughOptions, BelongsToManyRemoveAssociationMixin: BelongsToManyRemoveAssociationMixin, BelongsToManyHasAssociationMixinOptions: BelongsToManyHasAssociationMixinOptions, BelongsToManyHasAssociationsMixin: BelongsToManyHasAssociationsMixin, BelongsToManyHasAssociationMixin: BelongsToManyHasAssociationMixin, BelongsToManyHasAssociationsMixinOptions: BelongsToManyHasAssociationsMixinOptions, JoinTableAttributes: JoinTableAttributes, BelongsToManyCountAssociationsMixin: BelongsToManyCountAssociationsMixin, BelongsToManySetAssociationsMixinOptions: BelongsToManySetAssociationsMixinOptions, BelongsToManyGetAssociationsMixinOptions: BelongsToManyGetAssociationsMixinOptions, BelongsToManyRemoveAssociationMixinOptions: BelongsToManyRemoveAssociationMixinOptions, BelongsToManyCountAssociationsMixinOptions: BelongsToManyCountAssociationsMixinOptions, BelongsToManySetAssociationsMixin: BelongsToManySetAssociationsMixin, ValidationError: ValidationError, DatabaseError: DatabaseError, UniqueConstraintErrorOptions: UniqueConstraintErrorOptions, UniqueConstraintError: UniqueConstraintError, CommonErrorProperties: CommonErrorProperties, ConnectionError: ConnectionError, EmptyResultError: EmptyResultError, TimeoutError: TimeoutError, InvalidConnectionError: InvalidConnectionError, BaseError: BaseError, AsyncQueueError: AsyncQueueError, ExclusionConstraintError: ExclusionConstraintError, AggregateError: AggregateError, HostNotFoundError: HostNotFoundError, HostNotReachableError: HostNotReachableError, OptimisticLockError: OptimisticLockError, ValidationErrorItem: ValidationErrorItem, SequelizeScopeError: SequelizeScopeError, ConnectionRefusedError: ConnectionRefusedError, AccessDeniedError: AccessDeniedError, ForeignKeyConstraintError: ForeignKeyConstraintError, ConnectionTimedOutError: ConnectionTimedOutError}} */
	Sequelize = Sequelize;
	/** @type {PG} */
	PG = PG;
	/** @type {sequelizeUtils} */
	sequelizeUtils = sequelizeUtils;

	/**
	 * @constructor
	 * @param {String} [dbName='app'] - DB name
	 * @param {String} [user='app'] - DB user
	 * @param {String} [password='masterkey'] - DB password
	 * @param {String|Object} [host='localhost'] - Hostname or options
	 * @param {Number} [port=5432] - DB port
	 * @param {String} [dialect='postgres'] - DB dialice
	 * @param {Boolean} [logging=false] - Enable SQL logging
	 * @param {Object} [options={}] - Options
	 */
	constructor(dbName = 'app', user = 'app', password = 'masterkey', host = 'localhost', port = 5432, dialect = 'postgres', logging = false, options = {}) {
		//Define options
		options = Object.assign({
			dialect,
			host: nTools.isObject(host) ? 'localhost' : host,
			logging,
			port
		}, nTools.isObject(host) ? host : options, options);

		//Call sequelize constructor
		super(dbName, user, password, options);

		//Basic properties
		this._options = options;
		this.Sequelize = Sequelize;
		this.Op = Op;
		this.PG = PG;
		this.sequelizeUtils = sequelizeUtils;
		this.struct = {};

		//Models storage
		/**
		 * @type {{[string]: Model}}
		 */
		this.models = {};
		this.mtms = {};

		//Map DataTypes
		nTools.iterate(DataTypes, (_, name) => this[name] = name.toLowerCase());
	}

	/**
	 * Pluralize function
	 * @param {String} what
	 * @returns {String}
	 */
	pluralize(what) {
		const str = this.sequelizeUtils.pluralize(what).toLowerCase();
		str[0] = str[0].toUpperCase();
		return str;
	}

	indexes(prefix, names) {
		return nTools.iterate(names, (name) => {
			let bTree = true;
			if (name[0] === '#') {
				bTree = false;
				name = name.slice(1);
			}

			return {
				name  : `${prefix}_${name}_idx`,
				using : bTree ? 'BTREE' : 'HASH',
				fields: [name]
			};
		}, []);
	}

	/**
	 *
	 * @param {String} what
	 * @returns {String}
	 */
	singularize(what) {
		const str = this.sequelizeUtils.singularize(what).toLowerCase();
		str[0] = str[0].toUpperCase();
		return str;
	}

	/**
	 * Link Many to Mant relations
	 * @param {String} from
	 * @param {String} to
	 * @param {*} _ - not used
	 * @param {String|Boolean} as
	 */
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
	 * @param {String} from - connect what
	 * @param {String} to - connect to
	 * @param {Boolean} hasMany - flag for hasMany
	 * @param {String} mountAs - mount as name
	 * @param {String} fkName - foreignKey name
	 * @param {Boolean} [mountAsPk=false] - modunt ad primary key
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
			throw new DBError('Can\'t find model for link', {to, from, models: Object.keys(this.models), mountAs, fkName});
		}

		const fkOptions = mountAs ? {foreignKey: fkName ? fkName : `${mountAs.singularize()}Id`} : fkName ? {foreignKey: fkName} : {};
		this.models[to][hasMany ? 'hasMany' : 'hasOne'](this.models[from], fkOptions);
		this.models[from].belongsTo(this.models[to], options);
	};

	/**
	 * @param {Object} schema
	 * @param {Object|String} parent
	 */
	processRelations(schema, parent = false) {
		if (!nTools.isObject(schema) || parent === '#' || parent === '$') return;

		nTools.iterateKeys(schema, (name, out) => {
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

	/**
	 * Register model
	 * @param {Boolean|Object} modelName
	 * @param {Boolean|Object} model
	 * @returns {Boolean}
	 */
	registerModel(modelName, model) {
		const struct = {};
		let options = {};
		const name = filterName(modelName);

		nTools.iterate(model, (val, key) => {
			let def = false;

			if (nTools.isArray(val)) {
				if (val[1]) def = val[1];
				if (val[2]) def = val[2];
				val = val[0];
			}

			if (key[0] === '#' && nTools.isObject(val)) {
				Object.assign(options, val);
				return;
			}

			if (key[0] === '$' && nTools.isArray(val)) {
				Object.assign(options, {
					indexes: this.indexes(name, val)
				});
				return;
			}

			if (nTools.isObject(val) && val.key) val = val.key;
			if (!nTools.isString(val)) return;

			let notNull = val.indexOf('!') !== -1;
			let unique = val.indexOf('~') !== -1;

			val = val.remove('!').remove('~').split('^');

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
					autoIncrement: typeObj.type === DataTypes.INTEGER
				});
			}

			if (def) typeObj.defaultValue = def;

			struct[key] = typeObj;
		});

		options.freezeTableName = true;

		if (this._options.disableTimestamps) {
			options.timestamps = false;
		}

		/**
		 * @type {ModelCtor<Model>}
		 */
		this.models[name] = this.define(name, struct, options);

		const dt = DataTypes;
		this.struct[name] = nTools.iterate(struct, (row) => {
			switch (row.type.toString().split('(')[0]) {
				case dt.STRING.key:
					return 'string';
				case dt.TEXT.key:
					return 'string';
				case dt.CITEXT.key:
					return 'string';
				case dt.INTEGER.key:
					return 'Number';
				case dt.BIGINT.key:
					return 'Number';
				case dt.FLOAT.key:
					return 'Number';
				case dt.REAL.key:
					return 'Number';
				case dt.DOUBLE.key:
					return 'Number';
				case dt.DECIMAL.key:
					return 'Number';
				case dt.TIME.key:
					return 'Date';
				case dt.DATE.key:
					return 'Date';
				case dt.DATEONLY.key:
					return 'Date';
				case dt.JSON.key:
					return 'any';
				case dt.JSONB.key:
					return 'any';
				case dt.BLOB.key:
					return 'Buffer';
				case dt.UUID.key:
					return 'string';
				case dt.UUIDV1.key:
					return 'string';
				case dt.UUIDV4.key:
					return 'string';
				case dt.CIDR.key:
					return 'string';
				case dt.INET.key:
					return 'string';
				case dt.MACADDR.key:
					return 'string';
				default:
					return 'string';
			}
		}, {});
		const self = this;

		/**
		 * @param {String} from
		 * @param {String} name
		 * @returns {ModelCtor<Model>|boolean}
		 */
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
				await nTools.iterate(nTools.toArray(to), async (el) => await mdl.create(mtmIds(this, name, el)));
			},
			async mtmRemove(name, to) {
				const mdl = getMtMmodel(this.constructor.name, name);
				if (!mdl) return false;
				await nTools.iterate(nTools.toArray(to), async () => await mdl.destroy());
			},
			async mtmGet(name) {
				/** @type {Model} */
				const res = await self.models[this.constructor.name].findOne({where: {id: this.id}, include: [name]});
				return res.getDataValue(name);
			}
		});
	};

	/**
	 * Define schema
	 * @param {Object} schema - DB schema
	 * @param {Boolean|Object} parent
	 */
	defineSchema(schema, parent = false) {
		if (parent) this.registerModel(parent, Object.clone(schema, true));

		nTools.iterateKeys(schema, (name, subSchema) => {
			if (name[0] !== '#' && nTools.isObject(subSchema)) this.defineSchema(Object.clone(subSchema), name);
		});

		if (!parent) this.processRelations(schema);
	};

	async makeDefs() {
		if (!this._options.defPath) return;

		const mainPath = this._options.defPath;

		let tables = '';
		let models = '';

		function makeRow(name, rows) {
			const rowsTxt = nTools.iterateKeys(rows, (name, type) => `	public ${name}?: ${type};`, []).join('\n');

			return `export class ${name.camelize()}<TModelAttributes extends {} = any, TCreationAttributes extends {} = TModelAttributes> extends Model<TModelAttributes, TCreationAttributes> {
${rowsTxt}
}\n\n`;
		}

		function makeModel(name) {
			return `	${name}: typeof ${name.camelize()};\n`;
		}

		function makeDef() {
			return `import {Model} from 'sequelize/types';
export * from 'sequelize/types';

${tables}

export abstract class Models {
${models}
}\n`;
		}

		nTools.iterate(this.struct, (struct, table) => {
			tables += makeRow(table, struct);
			models += makeModel(table);
		});

		try {
			await fs.mkdir(mainPath);
			await fs.unlink(`${mainPath}/models.d.ts`);
		} catch (e) {}

		await fs.writeFile(`${mainPath}/models.d.ts`, makeDef());
	}

	/**
	 * @param {Model&DataValues} what - DB Model
	 * @param {Object|String} retVal
	 * @returns {Promise<Object>|Promise<Boolean>}
	 */
	getValues(what, retVal) {
		const defValues = (what, def = false) =>
			what.dataValues
			? retVal
			  ? nTools.isObject(retVal)
				? Object.assign(what.get({plain: true}), retVal)
				: what.get({plain: true})[retVal]
			  : what.get({plain: true})
			: def;

		if (nTools.isObject(what)) return defValues(what);
		if (nTools.isArray(what)) return nTools.iterate(what, (row) => defValues(row), []);
	};

	/**
	 * @param what
	 * @param list
	 * @returns {*}
	 */
	cleanParams(what, list) {
		if (!nTools.isObject(what)) return what;

		const defList = ['id'];
		nTools.iterateKeys(list || defList, (name) => { delete what[name]; });

		return what;
	};

	/**
	 * @param {ModelCtor} model
	 * @param {String} col
	 * @returns {Promise<[]>}
	 */
	async distinct(model, col) {
		const rows = await model.findAll({
			attributes: [[this.Sequelize.fn('DISTINCT', this.Sequelize.col(col)), col]],
			raw       : true
		});

		return nTools.iterate(rows, (row) => row[col], []).sort();
	}

	async rawQuery(query, options = {}) {
		return this.query(query, Object.assign({type: Sequelize.QueryTypes.RAW}, options));
	}

	async rawSelectQuery(query, replacements = {}, options = {}) {
		return this.query(query, Object.assign({type: Sequelize.QueryTypes.SELECT, replacements}, options));
	}

	/**
	 * @param {Object} what
	 * @return {Object}
	 */
	toNested(what) {
		return DB.toNested(what);
	}

	/**
	 * @static
	 * @param {Object} what
	 * @return {Object}
	 */
	static toNested(what) {
		const out = {};
		nTools.iterate(what, (val, path) => {
			const keys = path.split('.');
			const lastKey = keys.pop();
			const lastObj = keys.reduce((obj, key) => obj[key] = obj[key] || {}, out);

			lastObj[lastKey] = val;
		});

		return out;
	}

	/**
	 * @static
	 * @param {Object[]} list
	 * @return {string}
	 */
	static getObjectHash(list) {
		const affectedRows = nTools.iterate(list, (el, idx) => nTools.isArray(el) ? undefined : el, {});
		return cryptTools.hash(JSON.stringify(affectedRows));
	}

	/**
	 * @static
	 * @param {Object[]} what
	 * @return {Object[]}
	 */
	static arrayToNested(what) {
		const hashed = {};

		nTools.iterate(what, (object) => {
			const hash = DB.getObjectHash(object);
			if (!hashed[hash]) {
				hashed[hash] = Object.assign({}, object);
				nTools.iterate(hashed[hash], (row, key) => {
					if (nTools.isArray(row)) delete hashed[hash][key];
				});
			}

			nTools.iterate(object, (row, key) => {
				if (!nTools.isArray(row)) return;

				hashed[hash][key] = (hashed[hash][key] || []).concat(row);
			});
		});

		nTools.iterate(hashed, (obj, hash) => {
			nTools.iterate(obj, (row, key) => {
				if (!nTools.isArray(row)) return;

				hashed[hash][key] = DB.arrayToNested(hashed[hash][key]);
			});
		});

		return nTools.iterate(hashed, (row) => row, []);
	}

	/**
	 * @param {Object[]} what
	 * @return {Object[]}
	 */
	arrayToNested(what) {
		return DB.arrayToNested(what);
	}
}

/**
 * @class {DBSQLITE & DB}
 */
class DBSQLITE extends DB {
	/**
	 *
	 * @param fName
	 * @param dbName
	 * @param logger
	 * @param options
	 */
	constructor(fName = 'main.db', dbName = 'db', logger = false, options) {
		super(dbName, '', '', '', 0, 'sqlite', logger, Object.assign({storage: fName}, options));
	}
}

module.exports = {DB, DBSQLITE, Sequelize, BigNumber, Op, Sugar, nTools, sequelizeUtils};
