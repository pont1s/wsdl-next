interface IObject {
  [key: string]: any;
  length?: never;
}

type TUnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

// istanbul ignore next
const isObject = (obj: any) => {
  if (typeof obj === 'object' && obj !== null) {
    if (typeof Object.getPrototypeOf === 'function') {
      const prototype = Object.getPrototypeOf(obj);
      return prototype === Object.prototype || prototype === null;
    }

    return Object.prototype.toString.call(obj) === '[object Object]';
  }

  return false;
};

const merge = <T extends IObject[]>(
  ...objects: T
): TUnionToIntersection<T[number]> => objects.reduce((result, current) => {
    const resultTmp = result;
    Object.keys(current).forEach((key) => {
      if (Array.isArray(resultTmp[key]) && Array.isArray(current[key])) {
        resultTmp[key] = merge.options.mergeArrays
          ? Array.from(new Set((resultTmp[key] as unknown[]).concat(current[key])))
          : current[key];
      } else if (isObject(resultTmp[key]) && isObject(current[key])) {
        resultTmp[key] = merge(resultTmp[key] as IObject, current[key] as IObject);
      } else {
        resultTmp[key] = current[key];
      }
    });

    return resultTmp;
  }, {}) as any;

interface IOptions {
  mergeArrays: boolean;
}

const defaultOptions: IOptions = {
  mergeArrays: true,
};

merge.options = defaultOptions;

merge.withOptions = <T extends IObject[]>(
  options: Partial<IOptions>,
  ...objects: T
) => {
  merge.options = {
    mergeArrays: true,
    ...options,
  };

  const result = merge(...objects);

  merge.options = defaultOptions;

  return result;
};

export default merge;
