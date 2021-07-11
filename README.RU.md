# @osmium/db
## API
### Экспорт модуля и инициализация
Модуль `@osmium/db` экспортирует:
* DB - Базовый класс DB, расширяет собой класс [ORM Sequelize](https://sequelize.org/master/class/lib/sequelize.js~Sequelize.html#instance-constructor-constructor)
    * `constructor(dbName = 'app', user = 'user', password = 'masterkey', host = 'localhost', port = 5432, dialect = 'postgres', logging = false, options = {})`
    <br>host - адрес хоста либо объект options (см. ниже)
    <br>dialect - один из [dialects](https://sequelize.org/master/manual/dialects.html)
    <br>logging - функция-логгер или false для отключения
    <br>options - опции Sequelize, добавляются через Object.assign
* DBSQLITE - Макрос для работы с SQLite, является оберткой для конструктора DB
    * `constructor(fName = 'main.db', dbName = 'db', logger = false, options = {})`
* Sequelize - оригинальный класс Sequelize
* BigNumber - класс [BigNumber.js](https://mikemcl.github.io/bignumber.js/)
* Op - Sequelize.Op
* Sugar - [SugarJS](https://sugarjs.com/)
* oTools - [@osmium/tools](https://github.com/osmiumjs/tools)
* sequelizeUtils - [sequelize/lib/utils](https://github.com/sequelize/sequelize/blob/master/lib/utils.js)

Примеры инициализации:
```
const {DB} = require('@osmium/db');
const db = new DB('dbName', 'userName', 'userPassword', 'host', 5432);
```
```
const {DB} = require('@osmium/db');
const db = new DB('dbName', 'userName', 'userPassword', {
    define: { timestamps: false }
});
```
```
const {DBSQLITE} = require('@osmium/db');
const db = new DBSQLITE('file.sqlite3');
```

### Методы класса DB (кроме наследуюмых из Sequelize)
* `defineSchema(modelDefinition)` - Задает модель базы данных, первым аргументом принимает структуру модели БД (см. раздел 'Модели')
    > Замечание: второй аргумент функции является служебным и не предназначен для использования вне @osmium/db

### Свойства класса DB
* `models` - Объект, где ключ - имя таблицы, значение - инстанс модели объявленный через [Sequelize.define](https://sequelize.org/master/class/lib/sequelize.js~Sequelize.html#instance-method-define)
    Примеры использования:
    ```javascript
    await db.models.table_a.findOne({where:{id:1}});
    ```

## Модели
### Формат описания
Описание моделей производится через объект, где ключ - имя таблицы, значение - описание полей.

Описание полей таблицы задается через объект, где ключ - имя поля + модификаторы имени поля, значение - тип данных + модификаторы типа данных.
В случае если в имени поля указан модификатор связи с таблицей, в значении используется либо true, либо объект с описанием таблицы связи (можно использовать только 1 раз)

Sequelize в таблицу автоматически добавляет поле `id` являющееся pk, unique и autoincrement.
<br> В случае если в таблице имеется поле с модификатором имени `*`, поле `id` не добавляется.

Также добавляются автоматически создаваемые и заполняемые поля `createdAt` и `updatedAt`, для их отключения можно использовать либо опции модели (через модификатор имени `#`)
<br> Для отключения обоих полуй `timestamps: false` или по-отдельности `createdAt: false` и/или `updatedAt: false`, либо переиминовать их - например `updatedAt: 'updateTimestamp'`

Примеры использования:
```javascript
{
    table_a: {
        someStr: "string!^128",
        someIng: "integer",
        someJson: "jsonb"
    },
    table_b: {
        "<table_a=tableA": true,
        someText: "text!"
    },
    table_d: {
        "><table_b" :true,
        "<*table_c@mtTableC=table_c_id": {
            someStr: "blob!"
        },
        someBool: "boolean"
    },
    table_e:{
        "<table_c": true
    }
}
```

### Типы данных
Тип данных | Тип в JS | Тип в SQL | Поддерживается | Примечание
--- | --- |  --- |  :---: | ---
`string` | string, длина <= 255 |  VARCHAR(255) | * |
`string^n` | string, длина <= n |  VARCHAR(n) | * |
`text` | string, любая длина | TEXT |  * | Медленнее чем string
`citext` | string, любая длина<br>регистронезависимый | CITEXT | PostgreSQL, SQLite |
`integer` | integer (32bit) | INTEGER | * | Диапазон -2147483648 / +2147483647
`number` | integer (53bit) | BIGINT<br>PgSQL - INT8 | * | Диапазон -9007199254740991 / +9007199254740991
`bigint` | Вх - integer, string<br>Вых - string | BIGINT<br>PgSQL - INT8 | * | Диапазон -9223372036854775808 / 9223372036854775807
`bignumber` | Вх - integer, string, bignumber.js<br>Вых - bignumber.js | BIGINT<br>PgSQL - INT8 | * | Диапазон -9223372036854775808 / 9223372036854775807<br>Возвращает экземпляр bignimber.js
`float` |  | FLOAT | * |
`float^n` |  | FLOAT(n) | * |
`float^n,t` |  | FLOAT(n,t) | * |
`real` |  | REAL | * |
`real^n` |  | REAL(n) | * |
`real^n,t` |  | REAL(n,t) | * |
`double` |  | DOUBLE | * |
`double^n` |  | DOUBLE(n) | * |
`double^n,t` |  | DOUBLE(n,t) | * |
`decimal` |  | DECIMAL | * |
`decimal^n,t` |  | DECIMAL(n,t) | * |
`date` |  | DATE | * |
`date^n` |  | DATE(n) | MySQL >= 5.6.4 |
`dateonly` |  | DATEONLY | * |
`boolean` |  | BOOLEAN | * |
`json` | Все что сериализуется JSON | JSON | PostgreSQL, SQLite, MySQL |
`jsonb`| Все что сериализуется JSON | JSONB | PostgreSQL | JSON с поддержкой поиска по нему
`blob` | Вх - Buffer, any->string<br>Вых - Buffer | BLOB,<br>PgSQL - BYTEA | PostgreSQL |
`uuid` | | PgSQL/SQLite - UUID,<br> MySQL - CHAR(36) BINARY | PostgreSQL, SQLite, MySQL |
`cidr` | | CIDR | PostgreSQL |
`inet` | | INET | PostgreSQL |
`macaddr` | | MACADDR | PostgreSQL |

### Модификаторы имени поля
Модификатор | Позиция | Значение
--- | --- | ---
`#` | Единственное значение | Задает опции модели таблицы, значение задается вместо типа поля и передается третьим аргументом в функцию [Sequelize.define](https://sequelize.org/master/class/lib/sequelize.js~Sequelize.html#instance-method-define)
`<`_table_ | Слева, самый первый | Создает связь One(таблица _table_) to Many(эта таблица)<br>Внешний ключ (foreign key) имеет имя в виде сингуляризированное имя таблицы или имя связи (при использовании `@`) + Id (userId для таблицы users)
`>`_table_ | Слева, самый первый | Создает связь One(эта таблица) to Many(таблица _table_)<br>Внешний ключ (foreign key) имеет имя в виде сингуляризированное имя таблицы или имя связи (при использовании `@`) + Id (userId для таблицы users)
`><`_table_<br>`<>`_table_ | Слева, самый первый | Создает связь Many to Many через промежуточную таблицу _thisTable_@_otherTable_<br>Поддерживает только модификатор `@`
`@`_asName_ | Справа, перед `=` | Задает имя связи (через AS) при связывании
`=`_pkName_ | Справа, самый последний | Задает имя внешнего ключа (foreign key)<br>По-умолчаню - внешний ключ (foreign key) имеет имя в виде сингуляризированное имя таблицы или имя связи (при использовании `@`) + Id (userId для таблицы users)<br>Кроме MtM
`*` | Слева, после указателя связанности (если есть) | Задает primary key, отключает реализацию по-умолчанию<br>Кроме MtM

### Модификаторы типа
Модификатор | Позиция | Значение
--- | --- | ---
`!` | Справа, перед `^` | NOT NULL
`~` | Справа, перед `^` | Уникальный
`^`_arg1,arg2,...argN_ | Справа, самый последний | Параметры типа Sequelize, например для STRING(arg1)

Примеры использования:
```javascript
{
    '>*user@employee=employee_id': true
}
```
```javascript
{
    '#': {
        timestamps: false
    },
    '<user@employee=employee_id': {
        some : 'string!'
    }
}
```

## Работа с Many to Many
Таблица связи создается автоматичски с именем `rightTable@leftTable` или если задан `AS` через `@` то `rightTable@leftTable#asName`

В инстанс модели добавлены следующие методы:
* `async mtmAdd(tableOrAsName, oppositeModelInstance)`, `async mtmAdd(tableOrAsName, [oppositeModelInstance])` - Добавить элемент или элементы в таблицу связи
* `async mtmRemove(tableOrAsName, oppositeModelInstance)`, `async mtmRemove(tableOrAsName, [oppositeModelInstance])` - Удалить элемент или элементы из таблицы связи
* `async mtmGet(tableOrAsName)` - Получить элементы связи

Пример использования:
```javascript
{
    users: {
        name         : 'string',
        '><userItems': true
    },
    items: {
        name: 'string'
    }
}
```
```javascript
const user = await db.models.users.create({name: 'Petya'});
const item1 = await db.models.items.create({name: 'Printer'});
const item2 = await db.models.items.create({name: 'Computer'});

await user.mtmAdd('userItems', [item1, item2]);
await db.models.goods.findOne({
    where  : {id: 1},
    include: ['userItems']
}
```
