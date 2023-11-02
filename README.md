<div align="center">
<h1>Prisma Extension Soft Delete</h1>

<p>Prisma extension for soft deleting records.</p>

<p>
  Soft deleting records is a common pattern in many applications. This library provides an extension for Prisma that
  allows you to soft delete records and exclude them from queries. It handles deleting records through relations and
  excluding soft deleted records when including relations or referencing them in where objects. It does this by using
  the <a href="https://github.com/olivierwilkinson/prisma-nested-middleware">prisma-extension-nested-operations</a>
  library to handle nested relations.
</p>

</div>

<hr />

[![Build Status][build-badge]][build]
[![version][version-badge]][package]
[![MIT License][license-badge]][license]
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![PRs Welcome][prs-badge]][prs]

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Installation](#installation)
- [Usage](#usage)
  - [Extension Setup](#extension-setup)
  - [Prisma Schema Setup](#prisma-schema-setup)
- [Behaviour](#behaviour)
  - [Deleting Records](#deleting-records)
    - [Deleting a Single Record](#deleting-a-single-record)
    - [Deleting Multiple Records](#deleting-multiple-records)
    - [Deleting Through a relationship](#deleting-through-a-relationship)
    - [Hard Deletes](#hard-deletes)
  - [Excluding Soft Deleted Records](#excluding-soft-deleted-records)
    - [Excluding Soft Deleted Records in a `findFirst` Operation](#excluding-soft-deleted-records-in-a-findfirst-operation)
    - [Excluding Soft Deleted Records in a `findMany` Operation](#excluding-soft-deleted-records-in-a-findmany-operation)
    - [Excluding Soft Deleted Records in a `findUnique` Operation](#excluding-soft-deleted-records-in-a-findunique-operation)
  - [Updating Records](#updating-records)
    - [Explicitly Updating Many Soft Deleted Records](#explicitly-updating-many-soft-deleted-records)
  - [Where objects](#where-objects)
    - [Explicitly Querying Soft Deleted Records](#explicitly-querying-soft-deleted-records)
  - [Including or Selecting Soft Deleted Records](#including-or-selecting-soft-deleted-records)
    - [Including or Selecting toMany Relations](#including-or-selecting-tomany-relations)
    - [Including or Selecting toOne Relations](#including-or-selecting-toone-relations)
    - [Explicitly Including Soft Deleted Records in toMany Relations](#explicitly-including-soft-deleted-records-in-tomany-relations)
- [LICENSE](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation

This module is distributed via [npm][npm] and should be installed as one of your
project's dependencies:

```
npm install prisma-extensions-soft-delete
```

`@prisma/client` is a peer dependency of this library, so you will need to
install it if you haven't already:

```
npm install @prisma/client
```

## Usage

### Extension Setup

To add soft delete functionality to your Prisma client create the extension using the `createSoftDeleteExtension`
function and pass it to `client.$extends`.

The `createSoftDeleteExtension` function takes a config object where you can define the models you want to use soft
delete with.

```typescript
import { PrismaClient } from "@prisma/client";

const client = new PrismaClient();

const extendedClient = client.$extends(
  createSoftDeleteExtension({
    models: {
      Comment: true,
    },
  })
);
```

By default the extension will use a `deleted` field of type `Boolean` on the model. If you want to use a custom field
name or value you can pass a config object for the model. For example to use a `deletedAt` field where the value is null
by default and a `DateTime` when the record is deleted you would pass the following:

```typescript
const extendedClient = client.$extends(
  createSoftDeleteExtension({
    models: {
      Comment: {
        field: "deletedAt",
        createValue: (deleted) => {
          if (deleted) return new Date();
          return null;
        },
      },
    },
  })
);
```

The `field` property is the name of the field to use for soft delete, and the `createValue` property is a function that
takes a deleted argument and returns the value for whether the record is soft deleted or not. The `createValue` method
must return a falsy value if the record is not deleted and a truthy value if it is deleted.

It is possible to setup soft delete for multiple models at once by passing a config for each model in the `models`
object:

```typescript
const extendedClient = client.$extends(
  createSoftDeleteExtension({
    models: {
      Comment: true,
      Post: true,
    },
  })
);
```

To modify the default field and type for all models you can pass a `defaultConfig`:

```typescript
const extendedClient = client.$extends(
  createSoftDeleteExtension({
    models: {
      Comment: true,
      Post: true,
    },
    defaultConfig: {
      field: "deletedAt",
      createValue: (deleted) => {
        if (deleted) return new Date();
        return null;
      },
    },
  })
);
```

When using the default config you can also override the default config for a specific model by passing a config object
for that model:

```typescript
const extendedClient = client.$extends(
  createSoftDeleteExtension({
    models: {
      Comment: true,
      Post: {
        field: "deleted",
        createValue: Boolean,
      },
    },
    defaultConfig: {
      field: "deletedAt",
      createValue: (deleted) => {
        if (deleted) return new Date();
        return null;
      },
    },
  })
);
```

The config object also has a `allowToOneUpdates` option that can be used to allow updates to toOne relationships through
nested updates. By default this is set to `false` and will throw an error if you try to update a toOne relationship
through a nested update. If you want to allow this you can set `allowToOneUpdates` to `true`:

```typescript
const extendedClient = client.$extends(
  createSoftDeleteExtension({
    models: {
      Comment: {
        field: "deleted",
        createValue: Boolean,
        allowToOneUpdates: true,
      },
    },
  })
);
```

For more information for why updating through toOne relationship is disabled by default see the
[Updating Records](#updating-records) section.

Similarly to `allowToOneUpdates` there is an `allowCompoundUniqueIndexWhere` option that can be used to allow using
where objects with compound unique index fields when using `findUnique` queries. By default this is set to `false` and
will throw an error if you try to use a where with compound unique index fields. If you want to allow this you can set
`allowCompoundUniqueIndexWhere` to `true`:

```typescript
const extendedClient = client.$extends(
  createSoftDeleteExtension({
    models: {
      Comment: {
        field: "deleted",
        createValue: Boolean,
        allowCompoundUniqueIndexWhere: true,
      },
    },
  })
);
```

For more information for why updating through toOne relationship is disabled by default see the
[Excluding Soft Deleted Records in a `findUnique` Operation](#excluding-soft-deleted-records-in-a-findunique-operation) section.


To allow to one updates or compound unique index fields globally you can use the `defaultConfig` to do so:

```typescript
const extendedClient = client.$extends(
  createSoftDeleteExtension({
    models: {
      User: true,
      Comment: true,
    },
    defaultConfig: {
      field: "deleted",
      createValue: Boolean,
      allowToOneUpdates: true,
      allowCompoundUniqueIndexWhere: true,
    },
  })
);
```

### Prisma Schema Setup

The Prisma schema must be updated to include the soft delete field for each model you want to use soft delete with.

For models configured to use the default field and type you must add the `deleted` field to your Prisma schema manually.
Using the Comment model configured in [Extension Setup](#extension-setup) you would need add the following to the
Prisma schema:

```prisma
model Comment {
  deleted   Boolean  @default(false)
  [other fields]
}
```

If the Comment model was configured to use a `deletedAt` field where the value is null by default and a `DateTime` when
the record is deleted you would need to add the following to your Prisma schema:

```prisma
model Comment {
  deletedAt DateTime?
  [other fields]
}
```

Models configured to use soft delete that are related to other models through a toOne relationship must have this
relationship defined as optional. This is because the extension will exclude soft deleted records when the relationship
is included or selected. If the relationship is not optional the types for the relation will be incorrect and you may
get runtime errors.

For example if you have an `author` relationship on the Comment model and the User model is configured to use soft
delete you would need to change the relationship to be optional:

```prisma
model Comment {
  authorId Int?
  author   User?   @relation(fields: [authorId], references: [id])
  [other fields]
}
```

`@unique` fields on models that are configured to use soft deletes may cause problems due to the records not actually
being deleted. If a record is soft deleted and then a new record is created with the same value for the unique field,
the new record will not be created.

## Behaviour

The main behaviour of the extension is to replace delete operations with update operations that set the soft delete
field to the deleted value.

The extension also prevents accidentally fetching or updating soft deleted records by excluding soft deleted records
from find queries, includes, selects and bulk updates. The extension does allow explicit queries for soft deleted
records and allows updates through unique fields such is it's id. The reason it allows updates through unique fields is
because soft deleted records can only be fetched explicitly so updates through a unique fields should be intentional.

### Deleting Records

When deleting a record using the `delete` or `deleteMany` operations the extension will change the operation to an
`update` operation and set the soft delete field to be the deleted value defined in the config for that model.

For example if the Comment model was configured to use the default `deleted` field of type `Boolean` the extension
would change the `delete` operation to an `update` operation and set the `deleted` field to `true`.

#### Deleting a Single Record

When deleting a single record using the `delete` operation:

```typescript
await client.comment.delete({
  where: {
    id: 1,
  },
});
```

The extension would change the operation to:

```typescript
await client.comment.update({
  where: {
    id: 1,
  },
  data: {
    deleted: true,
  },
});
```

#### Deleting Multiple Records

When deleting multiple records using the `deleteMany` operation:

```typescript
await client.comment.deleteMany({
  where: {
    id: {
      in: [1, 2, 3],
    },
  },
});
```

The extension would change the operation to:

```typescript
await client.comment.updateMany({
  where: {
    id: {
      in: [1, 2, 3],
    },
  },
  data: {
    deleted: true,
  },
});
```

#### Deleting Through a relationship

When using a nested delete through a relationship the extension will change the nested delete operation to an update
operation:

```typescript
await client.post.update({
  where: {
    id: 1,
  },
  data: {
    comments: {
      delete: {
        where: {
          id: 2,
        },
      },
    },
    author: {
      delete: true,
    },
  },
});
```

The extension would change the operation to:

```typescript
await client.post.update({
  where: {
    id: 1,
  },
  data: {
    comments: {
      update: {
        where: {
          id: 2,
        },
        data: {
          deleted: true,
        },
      },
    },
    author: {
      update: {
        deleted: true,
      },
    },
  },
});
```

The same behaviour applies when using a nested `deleteMany` with a toMany relationship.

#### Hard Deletes

Hard deletes are not currently supported by this extension, when the `extendedWhereUnique` feature is supported
it will be possible to explicitly hard delete a soft deleted record. In the meantime you can use the `executeRaw`
operation to perform hard deletes.

### Excluding Soft Deleted Records

When using the `findUnique`, `findFirst` and `findMany` operations the extension will modify the `where` object passed
to exclude soft deleted records. It does this by adding an additional condition to the `where` object that excludes
records where the soft delete field is set to the deleted value defined in the config for that model.

#### Excluding Soft Deleted Records in a `findFirst` Operation

When using a `findFirst` operation the extension will modify the `where` object to exclude soft deleted records, so for:

```typescript
await client.comment.findFirst({
  where: {
    id: 1,
  },
});
```

The extension would change the operation to:

```typescript
await client.comment.findFirst({
  where: {
    id: 1,
    deleted: false,
  },
});
```

#### Excluding Soft Deleted Records in a `findMany` Operation

When using a `findMany` operation the extension will modify the `where` object to exclude soft deleted records, so for:

```typescript
await client.comment.findMany({
  where: {
    id: 1,
  },
});
```

The extension would change the operation to:

```typescript
await client.comment.findMany({
  where: {
    id: 1,
    deleted: false,
  },
});
```

#### Excluding Soft Deleted Records in a `findUnique` Operation

When using a `findUnique` operation the extension will change the query to use `findFirst` so that it can modify the
`where` object to exclude soft deleted records, so for:

```typescript
await client.comment.findUnique({
  where: {
    id: 1,
  },
});
```

The extension would change the operation to:

```typescript
await client.comment.findFirst({
  where: {
    id: 1,
    deleted: false,
  },
});
```

When querying using a compound unique index in the where object the extension will throw an error by default. This
is because it is not possible to use these types of where object with `findFirst` and it is not possible to exclude
soft-deleted records when using `findUnique`. For example take the following query:

```typescript
await client.user.findUnique({
  where: {
    name_email: {
      name: "foo",
      email: "bar",
    },
  },
});
```

Since the compound unique index `@@unique([name, email])` is being queried through the `name_email` field of the where
object the extension will throw to avoid accidentally returning a soft deleted record.

It is possible to override this behaviour by setting `allowCompoundUniqueIndexWhere` to `true` in the model config.

### Updating Records

Updating records is split into three categories, updating a single record using a root operation, updating a single
record through a relation and updating multiple records either through a root operation or a relation.

When updating a single record using a root operation such as `update` or `upsert` the extension will not modify the
operation. This is because unless explicitly queried for soft deleted records should not be returned from queries,
so if these operations are updating a soft deleted record it should be intentional.

When updating a single record through a relation the extension will throw an error by default. This is because it is
not possible to filter out soft deleted records for nested toOne relations. For example take the following query:

```typescript
await client.post.update({
  where: {
    id: 1,
  },
  data: {
    author: {
      update: {
        name: "foo",
      },
    },
  },
});
```

Since the `author` field is a toOne relation it does not support a where object. This means that if the `author` field
is a soft deleted record it will be updated accidentally.

It is possible to override this behaviour by setting `allowToOneUpdates` to `true` in the extension config.

When updating multiple records using `updateMany` the extension will modify the `where` object passed to exclude soft
deleted records. For example take the following query:

```typescript
await client.comment.updateMany({
  where: {
    id: 1,
  },
  data: {
    content: "foo",
  },
});
```

The extension would change the operation to:

```typescript
await client.comment.updateMany({
  where: {
    id: 1,
    deleted: false,
  },
  data: {
    content: "foo",
  },
});
```

This also works when a toMany relation is updated:

```typescript
await client.post.update({
  where: {
    id: 1,
  },
  data: {
    comments: {
      updateMany: {
        where: {
          id: 1,
        },
        data: {
          content: "foo",
        },
      },
    },
  },
});
```

The extension would change the operation to:

```typescript
await client.post.update({
  where: {
    id: 1,
  },
  data: {
    comments: {
      updateMany: {
        where: {
          id: 1,
          deleted: false,
        },
        data: {
          content: "foo",
        },
      },
    },
  },
});
```

#### Explicitly Updating Many Soft Deleted Records

When using the `updateMany` operation it is possible to explicitly update many soft deleted records by setting the
deleted field to the deleted value defined in the config for that model. An example that would update soft deleted
records would be:

```typescript
await client.comment.updateMany({
  where: {
    content: "foo",
    deleted: true,
  },
  data: {
    content: "bar",
  },
});
```

### Where objects

When using a `where` query it is possible to reference models configured to use soft deletes. In this case the
extension will modify the `where` object to exclude soft deleted records from the query, so for:

```typescript
await client.post.findMany({
  where: {
    id: 1,
    comments: {
      some: {
        content: "foo",
      },
    },
  },
});
```

The extension would change the operation to:

```typescript
await client.post.findMany({
  where: {
    id: 1,
    comments: {
      some: {
        content: "foo",
        deleted: false,
      },
    },
  },
});
```

This also works when the where object includes logical operators:

```typescript
await client.post.findMany({
  where: {
    id: 1,
    OR: [
      {
        comments: {
          some: {
            author: {
              name: "Jack",
            },
          },
        },
      },
      {
        comments: {
          none: {
            author: {
              name: "Jill",
            },
          },
        },
      },
    ],
  },
});
```

The extension would change the operation to:

```typescript
await client.post.findMany({
  where: {
    id: 1,
    OR: [
      {
        comments: {
          some: {
            deleted: false,
            author: {
              name: "Jack",
            },
          },
        },
      },
      {
        comments: {
          none: {
            deleted: false,
            author: {
              name: "Jill",
            },
          },
        },
      },
    ],
  },
});
```

When using the `every` modifier the extension will modify the `where` object to exclude soft deleted records from the
query in a different way, so for:

```typescript
await client.post.findMany({
  where: {
    id: 1,
    comments: {
      every: {
        content: "foo",
      },
    },
  },
});
```

The extension would change the operation to:

```typescript
await client.post.findMany({
  where: {
    id: 1,
    comments: {
      every: {
        OR: [{ deleted: { not: false } }, { content: "foo" }],
      },
    },
  },
});
```

This is because if the same logic that is used for `some` and `none` were to be used with `every` then the query would
fail for cases where there are deleted models.

The deleted case uses the `not` operator to ensure that the query works for custom fields and types. For example if the
field was configured to be `deletedAt` where the type is `DateTime` when deleted and `null` when not deleted then the
query would be:

```typescript
await client.post.findMany({
  where: {
    id: 1,
    comments: {
      every: {
        OR: [{ deletedAt: { not: null } }, { content: "foo" }],
      },
    },
  },
});
```

#### Explicitly Querying Soft Deleted Records

It is possible to explicitly query soft deleted records by setting the configured field in the `where` object. For
example the following will include deleted records in the results:

```typescript
await client.comment.findMany({
  where: {
    deleted: true,
  },
});
```

It is also possible to explicitly query soft deleted records through relationships in the `where` object. For example
the following will also not be modified:

```typescript
await client.post.findMany({
  where: {
    comments: {
      some: {
        deleted: true,
      },
    },
  },
});
```

### Including or Selecting Soft Deleted Records

When using `include` or `select` the extension will modify the `include` and `select` objects passed to exclude soft
deleted records.

#### Including or Selecting toMany Relations

When using `include` or `select` on a toMany relationship the extension will modify the where object to exclude soft
deleted records from the query, so for:

```typescript
await client.post.findMany({
  where: {
    id: 1,
  },
  include: {
    comments: true,
  },
});
```

If the Comment model was configured to be soft deleted the extension would modify the `include` action where object to
exclude soft deleted records, so the query would be:

```typescript
await client.post.findMany({
  where: {
    id: 1,
  },
  include: {
    comments: {
      where: {
        deleted: false,
      },
    },
  },
});
```

The same applies for `select`:

```typescript
await client.post.findMany({
  where: {
    id: 1,
  },
  select: {
    comments: true,
  },
});
```

This also works for nested includes and selects:

```typescript
await client.user.findMany({
  where: {
    id: 1,
  },
  include: {
    posts: {
      select: {
        comments: {
          where: {
            content: "foo",
          },
        },
      },
    },
  },
});
```

The extension would modify the query to:

```typescript
await client.user.findMany({
  where: {
    id: 1,
  },
  include: {
    posts: {
      select: {
        comments: {
          where: {
            deleted: false,
            content: "foo",
          },
        },
      },
    },
  },
});
```

#### Including or Selecting toOne Relations

Records included through a toOne relation are also excluded, however there is no way to explicitly include them. For
example the following query:

```typescript
await client.post.findFirst({
  where: {
    id: 1,
  },
  include: {
    author: true,
  },
});
```

The extension would not modify the query since toOne relations do not support where clauses. Instead the extension
will manually filter results based on the configured deleted field.

So if the author of the Post was soft deleted the extension would filter the results and remove the author from the
results:

```typescript
{
  id: 1,
  title: "foo",
  author: null
}
```

When selecting specific fields on a toOne relation the extension will manually add the configured deleted field to the
select object, filter the results and finally strip the deleted field from the results before returning them.

For example the following query would behave that way:

```typescript
await client.post.findMany({
  where: {
    id: 1,
  },
  select: {
    author: {
      select: {
        name: true,
      },
    },
  },
});
```

#### Explicitly Including Soft Deleted Records in toMany Relations

It is possible to explicitly include soft deleted records in toMany relations by adding the configured deleted field to
the `where` object. For example the following will include deleted records in the results:

```typescript
await client.post.findMany({
  where: {
    id: 1,
  },
  include: {
    comments: {
      where: {
        deleted: true,
      },
    },
  },
});
```

## LICENSE

Apache 2.0

[npm]: https://www.npmjs.com/
[node]: https://nodejs.org
[build-badge]: https://github.com/olivierwilkinson/prisma-extension-soft-delete/workflows/prisma-soft-delete-middleware/badge.svg
[build]: https://github.com/olivierwilkinson/prisma-extension-soft-delete/actions?query=branch%3Amaster+workflow%3Aprisma-extension-soft-delete
[version-badge]: https://img.shields.io/npm/v/prisma-soft-delete-middleware.svg?style=flat-square
[package]: https://www.npmjs.com/package/prisma-soft-delete-middleware
[downloads-badge]: https://img.shields.io/npm/dm/prisma-soft-delete-middleware.svg?style=flat-square
[npmtrends]: http://www.npmtrends.com/prisma-soft-delete-middleware
[license-badge]: https://img.shields.io/npm/l/prisma-soft-delete-middleware.svg?style=flat-square
[license]: https://github.com/olivierwilkinson/prisma-extension-soft-delete/blob/main/LICENSE
[prs-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs]: http://makeapullrequest.com
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/olivierwilkinson/prisma-extension-soft-delete/blob/main/other/CODE_OF_CONDUCT.md
