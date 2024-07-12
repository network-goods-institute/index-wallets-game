import {
  absDependencies,
  BigNumber,
  bignumberDependencies,
  create,
  dotDivideDependencies,
  multiplyDependencies,
  sumDependencies,
} from "mathjs";

export const bnMath = create(
  {
    absDependencies,
    bignumberDependencies,
    multiplyDependencies,
    dotDivideDependencies,
    sumDependencies,
  },
  {
    number: "BigNumber",
    precision: 64,
    relTol: 1e-60,
    absTol: 1e-63,
  },
);

export const bn = bnMath.bignumber;

export const bnZeroPad = (vector: BigNumber[], length: number) =>
  vector.concat(Array(length - vector.length).fill(bn(0)));

export const bnStringify = (bn: BigNumber) => bn.toString();
