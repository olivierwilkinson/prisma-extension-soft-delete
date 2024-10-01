import { Prisma } from "@prisma/client";
import { Prisma as PrismaExtensions } from "@prisma/client/extension";
import {
  NestedOperation,
  withNestedOperations,
} from "prisma-extension-nested-operations";
import {
  createAggregateParams,
  createCountParams,
  createDeleteManyParams,
  createDeleteParams,
  createFindFirstParams,
  createFindFirstOrThrowParams,
  createFindManyParams,
  createFindUniqueParams,
  createFindUniqueOrThrowParams,
  createIncludeParams,
  createSelectParams,
  createUpdateManyParams,
  createUpdateParams,
  createUpsertParams,
  createWhereParams,
  createGroupByParams,
  CreateParams,
} from "./helpers/createParams";

import { Config, ModelConfig } from "./types";
import { ModifyResult, modifyReadResult } from "./helpers/modifyResult";

type ConfigBound<F> = F extends (x: ModelConfig, ...args: infer P) => infer R
  ? (...args: P) => R
  : never;

export function createSoftDeleteExtension({
  models,
  defaultConfig = {
    field: "deleted",
    createValue: Boolean,
    allowToOneUpdates: false,
    allowCompoundUniqueIndexWhere: false,
  },
}: Config) {
  if (!defaultConfig.field) {
    throw new Error(
      "prisma-extension-soft-delete: defaultConfig.field is required"
    );
  }
  if (!defaultConfig.createValue) {
    throw new Error(
      "prisma-extension-soft-delete: defaultConfig.createValue is required"
    );
  }

  const modelConfig: Partial<Record<Prisma.ModelName, ModelConfig>> = {};

  Object.keys(models).forEach((model) => {
    const modelName = model as Prisma.ModelName;
    const config = models[modelName];
    if (config) {
      modelConfig[modelName] =
        typeof config === "boolean" && config ? defaultConfig : config;
    }
  });

  const createParamsByModel = Object.keys(modelConfig).reduce<
    Record<string, Record<string, ConfigBound<CreateParams> | undefined>>
  >((acc, model) => {
    const config = modelConfig[model as Prisma.ModelName]!;
    return {
      ...acc,
      [model]: {
        delete: createDeleteParams.bind(null, config),
        deleteMany: createDeleteManyParams.bind(null, config),
        update: createUpdateParams.bind(null, config),
        updateMany: createUpdateManyParams.bind(null, config),
        upsert: createUpsertParams.bind(null, config),
        findFirst: createFindFirstParams.bind(null, config),
        findFirstOrThrow: createFindFirstOrThrowParams.bind(null, config),
        findUnique: createFindUniqueParams.bind(null, config),
        findUniqueOrThrow: createFindUniqueOrThrowParams.bind(null, config),
        findMany: createFindManyParams.bind(null, config),
        count: createCountParams.bind(null, config),
        aggregate: createAggregateParams.bind(null, config),
        where: createWhereParams.bind(null, config),
        include: createIncludeParams.bind(null, config),
        select: createSelectParams.bind(null, config),
        groupBy: createGroupByParams.bind(null, config),
      },
    };
  }, {});

  const modifyResultByModel = Object.keys(modelConfig).reduce<
    Record<string, Record<string, ConfigBound<ModifyResult> | undefined>>
  >((acc, model) => {
    const config = modelConfig[model as Prisma.ModelName]!;
    return {
      ...acc,
      [model]: {
        include: modifyReadResult.bind(null, config),
        select: modifyReadResult.bind(null, config),
      },
    };
  }, {});

  // before handling root params generate deleted value so it is consistent
  // for the query. Add it to root params and get it from scope?

  return PrismaExtensions.defineExtension((client) => {
    return client.$extends({
      query: {
        $allModels: {
          // @ts-expect-error - we don't know what the client is
          $allOperations: withNestedOperations({
            async $rootOperation(initialParams) {
              const createParams =
                createParamsByModel[initialParams.model || ""]?.[
                  initialParams.operation
                ];

              if (!createParams) return initialParams.query(initialParams.args);

              const { params, ctx } = createParams(initialParams);
              const { model } = params;

              const operationChanged =
                params.operation !== initialParams.operation;

              const result = operationChanged
                ? // @ts-expect-error - we don't know what the client is
                  await client[model[0].toLowerCase() + model.slice(1)][
                    params.operation
                  ](params.args)
                : await params.query(params.args);

              const modifyResult =
                modifyResultByModel[params.model || ""]?.[params.operation];

              if (!modifyResult) return result;

              return modifyResult(result, params, ctx);
            },
            async $allNestedOperations(initialParams) {
              const createParams =
                createParamsByModel[initialParams.model || ""]?.[
                  initialParams.operation
                ];

              if (!createParams) return initialParams.query(initialParams.args);

              const { params, ctx } = createParams(initialParams);

              const result = await params.query(
                params.args,
                params.operation as NestedOperation
              );

              const modifyResult =
                modifyResultByModel[params.model || ""]?.[params.operation];

              if (!modifyResult) return result;

              return modifyResult(result, params, ctx);
            },
          }),
        },
      },
    });
  });
}
