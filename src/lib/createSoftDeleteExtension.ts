import { Prisma } from "@prisma/client";
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

const rootOperations = [
  "delete",
  "deleteMany",
  "update",
  "updateMany",
  "upsert",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
] as const;

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

  const modelNames = Object.keys(models) as Prisma.ModelName[];

  const modelConfig: Partial<Record<Prisma.ModelName, ModelConfig>> = {};
  modelNames.forEach((modelName) => {
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

  return Prisma.defineExtension((client) =>
    client.$extends({
      name: "prisma-extension-soft-delete",
      model: Prisma.dmmf.datamodel.models
        .map((modelDef) => modelDef.name)
        .reduce(function (modelsAcc, configModelName) {
          const modelName =
            configModelName[0].toLowerCase() + configModelName.slice(1);

          return {
            ...modelsAcc,
            [modelName]: rootOperations.reduce(function (
              opsAcc,
              rootOperation
            ) {
              return {
                ...opsAcc,
                [rootOperation]: function (args: any) {
                  const $allOperations = withNestedOperations({
                    async $rootOperation(initialParams) {
                      const createParams =
                        createParamsByModel[initialParams.model]?.[
                          initialParams.operation
                        ];

                      if (!createParams)
                        return initialParams.query(initialParams.args);

                      const { params, ctx } = createParams(initialParams);

                      // @ts-expect-error - we don't know what the client is
                      const result = await client[modelName][params.operation](
                        params.args
                      );

                      const modifyResult =
                        modifyResultByModel[params.model]?.[params.operation];

                      if (!modifyResult) return result;

                      return modifyResult(result, params, ctx);
                    },
                    async $allNestedOperations(initialParams) {
                      const createParams =
                        createParamsByModel[initialParams.model]?.[
                          initialParams.operation
                        ];

                      if (!createParams)
                        return initialParams.query(initialParams.args);

                      const { params, ctx } = createParams(initialParams);

                      const result = await params.query(
                        params.args,
                        params.operation as NestedOperation
                      );

                      const modifyResult =
                        modifyResultByModel[params.model]?.[params.operation];

                      if (!modifyResult) return result;

                      return modifyResult(result, params, ctx);
                    },
                  });

                  return $allOperations({
                    model: configModelName as any,
                    operation: rootOperation,
                    // @ts-expect-error - we don't know what the client is
                    query: client[modelName][rootOperation],
                    args,
                  });
                },
              };
            },
            {}),
          };
        }, {}),
    })
  );
}
