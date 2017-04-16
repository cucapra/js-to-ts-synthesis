import {Iterable} from "immutable";

export interface LatticeElement<ParamsT> {
    ascendingPaths(params: ParamsT): Iterable<{}, this>;
}

export class Lattice<T extends LatticeElement<ParamsT>, ParamsT> {
    /**
     * For now, just walk along one arbitrary path. This may be improved later.
     */
    walk(element: T, params: ParamsT): T {
        let ascendingPaths = element.ascendingPaths(params);
        return ascendingPaths.isEmpty() ? element : this.walk(ascendingPaths.first(), params);
    }
}