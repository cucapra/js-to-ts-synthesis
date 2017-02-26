import {Set, DefaultDictionary} from "typescript-collections";

export class SetDictionary<K, V> extends DefaultDictionary<K, Set<V>> {
    constructor() {
        super(() => new Set<V>());
    }
}

export class ListDictionary<K, V> extends DefaultDictionary<K, V[]> {
    constructor() {
        super(() => []);
    }
}