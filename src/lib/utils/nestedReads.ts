import { ModelConfig } from "../types";

export function addDeletedToSelect<T extends { args?: any }>(
  params: T,
  config: ModelConfig
): T {
  if (params.args.select && !params.args.select[config.field]) {
    return {
      ...params,
      args: {
        ...params.args,
        select: {
          ...params.args.select,
          [config.field]: true,
        },
      },
    };
  }

  return params;
}

export function stripDeletedFieldFromResults(
  results: any,
  config: ModelConfig
) {
  if (Array.isArray(results)) {
    results?.forEach((item: any) => {
      delete item[config.field];
    });
  } else if (results) {
    delete results[config.field];
  }

  return results;
}
