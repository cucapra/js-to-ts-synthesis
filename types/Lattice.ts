import {Iterable} from "immutable";

export interface LatticeElement<T, ParamsT> {
    isTop(): boolean;
    ascendingPaths(params: ParamsT): Iterable<number, T>;
}

export class Lattice<T extends LatticeElement<T, ParamsT>, ParamsT> {
    /**
     * For now, just walk along one arbitrary path. This may be improved later.
     */
    walk(element: T, params: ParamsT): T {
        let ascendingPaths = element.ascendingPaths(params);
        return ascendingPaths.isEmpty() ? element : this.walk(ascendingPaths.first(), params);
    }
}