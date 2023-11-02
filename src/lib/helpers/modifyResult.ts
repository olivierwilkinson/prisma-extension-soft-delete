import { ModelConfig } from "../types";
import { stripDeletedFieldFromResults } from "../utils/nestedReads";
import {
  filterSoftDeletedResults,
  shouldFilterDeletedFromReadResult,
} from "../utils/resultFiltering";
import { CreateParamsReturn } from "./createParams";

export type ModifyResult = (
  config: ModelConfig,
  result: any,
  params: CreateParamsReturn["params"],
  ctx?: any
) => any;

export function modifyReadResult(
  config: ModelConfig,
  result: any,
  params: CreateParamsReturn["params"],
  ctx?: any
): CreateParamsReturn {
  if (shouldFilterDeletedFromReadResult(params, config)) {
    const filteredResults = filterSoftDeletedResults(result, config);

    if (ctx?.deletedFieldAdded) {
      stripDeletedFieldFromResults(filteredResults, config);
    }

    return filteredResults;
  }

  return result;
}
