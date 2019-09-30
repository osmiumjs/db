const util = require('util');
const _ = require('lodash');

function inherits(constructor, superConstructor) {
	util.inherits(constructor, superConstructor);
	_.extend(constructor, superConstructor);
}

function timestampParent(Sequelize) {
	const DataTypes = Sequelize.DataTypes;

	function TIMESTAMP(options) {
		if (!(this instanceof TIMESTAMP)) return new TIMESTAMP(options);
	}

	inherits(TIMESTAMP, DataTypes.ABSTRACT);

	TIMESTAMP.key = 'TIMESTAMP';
	TIMESTAMP.prototype.toSql = function () {
		let sql = 'TIMESTAMP WITHOUT TIME ZONE';
		if (this._options && this._options.notNull) sql += ' NOT NULL';
		return sql;
	};

	DataTypes.TIMESTAMP = TIMESTAMP;
	Sequelize.DataTypes = DataTypes;
	Sequelize.TIMESTAMP = TIMESTAMP;

	return Sequelize;
}


function timestampPostgres(Sequelize) {
	const DataTypes = Sequelize.DataTypes;

	function TIMESTAMP(options) {
		if (!(this instanceof TIMESTAMP)) return new TIMESTAMP(options);
	}

	inherits(TIMESTAMP, DataTypes.TIMESTAMP);

	TIMESTAMP.prototype.parse = function (value) {
		return (typeof value === 'string' || typeof value === 'number') ? new Date(value) : value;
	};

	DataTypes.postgres.TIMESTAMP = TIMESTAMP;

	DataTypes.TIMESTAMP.types.postgres = {
		oids      : [1114],
		array_oids: [1115]
	};

	if (Sequelize) {
		Sequelize.DataTypes = DataTypes;
		return Sequelize;
	}

	return DataTypes;
}

module.exports = function (DataTypes) {
	return timestampPostgres(timestampParent(DataTypes));
};
