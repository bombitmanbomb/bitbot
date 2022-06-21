import _ from "lodash";


/**
 * Utility Class for string variable replacement.
 */
export class VariableReplacement {
  private Replacement: IReplacement;
  constructor(replace: IReplacement) {
    this.Replacement = replace;
  }

  /**
   * process All strings on an object
   * @param input Object to iterate through
   * @param replace Objects used for replacement
   * @param prefix
   * @param suffix
   * @param maxDepth
   * @param currentDepth
   * @returns
   */
  public static replaceObject<T extends Record<any, any>>(
    input: T,
    replace: IReplacement,
    maxDepth = 15,
    currentDepth = 0
  ): T {
    if (currentDepth > maxDepth) return input; // Prevent Circular Overflow
    const NewObject = {} as Record<any, any>;
    for (const key of Object.keys(input)) {
      const propertyValue = (input as unknown as { [prop: string]: any })[
        key as string
      ];
      switch (typeof propertyValue) {
        case "string": {
          NewObject[key] = VariableReplacement.replace(propertyValue, replace);
          continue;
        }
        case "object": {
          NewObject[key] = VariableReplacement.replaceObject(
            propertyValue,
            replace,
            maxDepth,
            currentDepth + 1
          );
          continue;
        }
        default:
          continue;
      }
    }
    return NewObject;
  }
  /**
   * Replace string with Object value
   * @param input
   * @param replace
   * @param prefix
   * @param suffix
   * @returns
   */
  public static replace(input: string, replace: IReplacement): string {
    const expression = /(?:{)([a-z._0-9$[\]]*)(?:})/gim;
    return input.replace(expression, (keyRaw: string) => {
      const key = keyRaw.substring(1, keyRaw.length - 1);
      const value = _.get(replace, key) as IReplacement;
      if (typeof value == "object")
        return (value?.valueOf() as string) ?? (value as unknown as string);
      return value as string;
    });
  }

  public replaceObject<T extends Record<any, any>>(input: T, maxDepth = 15, currentDepth = 0): T {
    return VariableReplacement.replaceObject<T>(input, this.Replacement);
  }
  public replace(input: string): string {
    return VariableReplacement.replace(input, this.Replacement);
  }
}

interface IReplacement {
  [key: string]: string | number | IReplacement;
}
