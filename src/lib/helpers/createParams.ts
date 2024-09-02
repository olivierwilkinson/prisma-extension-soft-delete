import { Prisma } from "@prisma/client";
import { NestedParams } from "prisma-extension-nested-operations";

import { ModelConfig } from "../types";
import { addDeletedToSelect } from "../utils/nestedReads";

const uniqueFieldsByModel: Record<string, string[]> = {};
const uniqueIndexFieldsByModel: Record<string, string[]> = {};

Prisma.dmmf.datamodel.models.forEach((model) => {
  // add unique fields derived from indexes
  const uniqueIndexFields: string[] = [];
  model.uniqueFields.forEach((field) => {
    uniqueIndexFields.push(field.join("_"));
  });
  uniqueIndexFieldsByModel[model.name] = uniqueIndexFields;

  // add id field and unique fields from @unique decorator
  const uniqueFields: string[] = [];
  model.fields.forEach((field) => {
    if (field.isId || field.isUnique) {
      uniqueFields.push(field.name);
    }
  });
  uniqueFieldsByModel[model.name] = uniqueFields;
});

export type Params = Omit<NestedParams<any>, "operation"> & {
  operation: string;
};

export type CreateParamsReturn = {
  params: Params;
  ctx?: any;
};

export type CreateParams = (
  config: ModelConfig,
  params: Params
) => CreateParamsReturn;

export const createDeleteParams: CreateParams = (
  { field, createValue },
  params
) => {
  if (
    !params.model ||
    // do nothing for delete: false
    (typeof params.args === "boolean" && !params.args) ||
    // do nothing for root delete without where to allow Prisma to throw
    (!params.scope && !params.args?.where)
  ) {
    return {
      params,
    };
  }

  if (typeof params.args === "boolean") {
    return {
      params: {
        ...params,
        operation: "update",
        args: {
          __passUpdateThrough: true,
          [field]: createValue(true),
        },
      },
    };
  }

  return {
    params: {
      ...params,
      operation: "update",
      args: {
        where: params.args?.where || params.args,
        data: {
          [field]: createValue(true),
        },
      },
    },
  };
};

export const createDeleteManyParams: CreateParams = (config, params) => {
  if (!params.model) return { params };

  const where = params.args?.where || params.args;

  return {
    params: {
      ...params,
      operation: "updateMany",
      args: {
        where: {
          ...where,
          [config.field]: config.createValue(false),
        },
        data: {
          [config.field]: config.createValue(true),
        },
      },
    },
  };
};

export const createUpdateParams: CreateParams = (config, params) => {
  if (
    params.scope?.relations &&
    !params.scope.relations.to.isList &&
    !config.allowToOneUpdates &&
    !params.args?.__passUpdateThrough
  ) {
    throw new Error(
      `prisma-extension-soft-delete: update of model "${params.model}" through "${params.scope?.parentParams.model}.${params.scope.relations.to.name}" found. Updates of soft deleted models through a toOne relation is not supported as it is possible to update a soft deleted record.`
    );
  }

  // remove __passUpdateThrough from args
  if (params.args?.__passUpdateThrough) {
    delete params.args.__passUpdateThrough;
  }

  return { params };
};

export const createUpdateManyParams: CreateParams = (config, params) => {
  // do nothing if args are not defined to allow Prisma to throw an error
  if (!params.args) return { params };

  return {
    params: {
      ...params,
      args: {
        ...params.args,
        where: {
          ...params.args?.where,
          // allow overriding the deleted field in where
          [config.field]:
            params.args?.where?.[config.field] || config.createValue(false),
        },
      },
    },
  };
};

export const createUpsertParams: CreateParams = (_, params) => {
  if (params.scope?.relations && !params.scope.relations.to.isList) {
    throw new Error(
      `prisma-extension-soft-delete: upsert of model "${params.model}" through "${params.scope?.parentParams.model}.${params.scope.relations.to.name}" found. Upserts of soft deleted models through a toOne relation is not supported as it is possible to update a soft deleted record.`
    );
  }

  return { params };
};

function validateFindUniqueParams(params: Params, config: ModelConfig): void {
  const uniqueIndexFields = uniqueIndexFieldsByModel[params.model || ""] || [];
  const uniqueIndexField = Object.keys(params.args?.where || {}).find((key) =>
    uniqueIndexFields.includes(key)
  );

  // when unique index field is found it is not possible to use findFirst.
  // Instead warn the user that soft-deleted models will not be excluded from
  // this query unless warnForUniqueIndexes is false.
  if (uniqueIndexField && !config.allowCompoundUniqueIndexWhere) {
    throw new Error(
      `prisma-extension-soft-delete: query of model "${params.model}" through compound unique index field "${uniqueIndexField}" found. Queries of soft deleted models through a unique index are not supported. Set "allowCompoundUniqueIndexWhere" to true to override this behaviour.`
    );
  }
}

function shouldPassFindUniqueParamsThrough(
  params: Params,
  config: ModelConfig
): boolean {
  const uniqueFields = uniqueFieldsByModel[params.model || ""] || [];
  const uniqueIndexFields = uniqueIndexFieldsByModel[params.model || ""] || [];
  const uniqueIndexField = Object.keys(params.args?.where || {}).find((key) =>
    uniqueIndexFields.includes(key)
  );

  // pass through invalid args so Prisma throws an error
  return (
    // findUnique must have a where object
    !params.args?.where ||
    typeof params.args.where !== "object" ||
    // where object must have at least one defined unique field
    !Object.entries(params.args.where).some(
      ([key, val]) =>
        (uniqueFields.includes(key) || uniqueIndexFields.includes(key)) &&
        typeof val !== "undefined"
    ) ||
    // pass through if where object has a unique index field and allowCompoundUniqueIndexWhere is true
    !!(uniqueIndexField && config.allowCompoundUniqueIndexWhere)
  );
}

export const createFindUniqueParams: CreateParams = (config, params) => {
  if (shouldPassFindUniqueParamsThrough(params, config)) {
    return { params };
  }

  validateFindUniqueParams(params, config);

  return {
    params: {
      ...params,
      operation: "findFirst",
      args: {
        ...params.args,
        where: {
          ...params.args?.where,
          // allow overriding the deleted field in where
          [config.field]: params.args?.where?.[config.field] || config.createValue(false),
        },
      },
    },
  };
};

export const createFindUniqueOrThrowParams: CreateParams = (config, params) => {
  if (shouldPassFindUniqueParamsThrough(params, config)) {
    return { params };
  }

  validateFindUniqueParams(params, config);

  return {
    params: {
      ...params,
      operation: "findFirstOrThrow",
      args: {
        ...params.args,
        where: {
          ...params.args?.where,
          // allow overriding the deleted field in where
          [config.field]: params.args?.where?.[config.field] || config.createValue(false),
        },
      },
    },
  };
};

export const createFindFirstParams: CreateParams = (config, params) => {
  return {
    params: {
      ...params,
      operation: "findFirst",
      args: {
        ...params.args,
        where: {
          ...params.args?.where,
          // allow overriding the deleted field in where
          [config.field]:
            params.args?.where?.[config.field] || config.createValue(false),
        },
      },
    },
  };
};

export const createFindFirstOrThrowParams: CreateParams = (config, params) => {
  return {
    params: {
      ...params,
      operation: "findFirstOrThrow",
      args: {
        ...params.args,
        where: {
          ...params.args?.where,
          // allow overriding the deleted field in where
          [config.field]:
            params.args?.where?.[config.field] || config.createValue(false),
        },
      },
    },
  };
};

export const createFindManyParams: CreateParams = (config, params) => {
  return {
    params: {
      ...params,
      operation: "findMany",
      args: {
        ...params.args,
        where: {
          ...params.args?.where,
          // allow overriding the deleted field in where
          [config.field]:
            params.args?.where?.[config.field] || config.createValue(false),
        },
      },
    },
  };
};

/*GroupBy */
export const createGroupByParams: CreateParams = (config, params) => {
  return {
    params: {
      ...params,
      operation: "groupBy",
      args: {
        ...params.args,
        where: {
          ...params.args?.where,
          // allow overriding the deleted field in where
          [config.field]:
            params.args?.where?.[config.field] || config.createValue(false),
        },
      },
    },
  };
};

export const createCountParams: CreateParams = (config, params) => {
  const args = params.args || {};
  const where = args.where || {};

  return {
    params: {
      ...params,
      args: {
        ...args,
        where: {
          ...where,
          // allow overriding the deleted field in where
          [config.field]: where[config.field] || config.createValue(false),
        },
      },
    },
  };
};

export const createAggregateParams: CreateParams = (config, params) => {
  const args = params.args || {};
  const where = args.where || {};

  return {
    params: {
      ...params,
      args: {
        ...args,
        where: {
          ...where,
          // allow overriding the deleted field in where
          [config.field]: where[config.field] || config.createValue(false),
        },
      },
    },
  };
};

export const createWhereParams: CreateParams = (config, params) => {
  if (!params.scope) return { params };

  // customise list queries with every modifier unless the deleted field is set
  if (params.scope?.modifier === "every" && !params.args[config.field]) {
    return {
      params: {
        ...params,
        args: {
          OR: [
            { [config.field]: { not: config.createValue(false) } },
            params.args,
          ],
        },
      },
    };
  }

  return {
    params: {
      ...params,
      args: {
        ...params.args,
        [config.field]: params.args[config.field] || config.createValue(false),
      },
    },
  };
};

export const createIncludeParams: CreateParams = (config, params) => {
  // includes of toOne relation cannot filter deleted records using params
  // instead ensure that the deleted field is selected and filter the results
  if (params.scope?.relations?.to.isList === false) {
    if (params.args?.select && !params.args?.select[config.field]) {
      return {
        params: addDeletedToSelect(params, config),
        ctx: { deletedFieldAdded: true },
      };
    }

    return { params };
  }

  return {
    params: {
      ...params,
      args: {
        ...params.args,
        where: {
          ...params.args?.where,
          // allow overriding the deleted field in where
          [config.field]:
            params.args?.where?.[config.field] || config.createValue(false),
        },
      },
    },
  };
};

export const createSelectParams: CreateParams = (config, params) => {
  // selects in includes are handled by createIncludeParams
  if (params.scope?.parentParams.operation === "include") {
    return { params };
  }

  // selects of toOne relation cannot filter deleted records using params
  if (params.scope?.relations?.to.isList === false) {
    if (params.args?.select && !params.args.select[config.field]) {
      return {
        params: addDeletedToSelect(params, config),
        ctx: { deletedFieldAdded: true },
      };
    }

    return { params };
  }

  return {
    params: {
      ...params,
      args: {
        ...params.args,
        where: {
          ...params.args?.where,
          // allow overriding the deleted field in where
          [config.field]:
            params.args?.where?.[config.field] || config.createValue(false),
        },
      },
    },
  };
};
