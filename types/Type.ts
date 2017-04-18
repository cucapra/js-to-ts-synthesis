import {Iterable, List, Set} from "immutable";
import {Validator} from "../Validator";
import {handle} from "../Value";
import {ArrayOrTupleTypeComponent} from "./ArrayOrTupleTypeComponent";
import {BooleanTypeComponent} from "./BooleanTypeComponent";
import {FunctionTypeComponent} from "./FunctionTypeComponent";
import {NullTypeComponent} from "./NullTypeComponent";
import {NumberTypeComponent} from "./NumberTypeComponent";
import {ObjectTypeComponent} from "./ObjectTypeComponent";
import {StringTypeComponent} from "./StringTypeComponent";
import {RoundUpParameters, TypeComponent} from "./TypeComponent";
import {UndefinedTypeComponent} from "./UndefinedTypeComponent";

class TypeDefinitionBuilder {
    private pieces: string[] = [];

    add(pieces: string[]) {
        for (let p of pieces) {
            this.pieces.push(p);
        }
        return this;
    }

    toDefinition() {
        return (this.pieces.length > 0) ? this.pieces.join("|") : "never";
    }
}

export class Type implements TypeComponent<{}> {

    constructor(
        private readonly nullType: NullTypeComponent,
        private readonly undefinedType: UndefinedTypeComponent,
        private readonly booleanType: BooleanTypeComponent,
        private readonly numberType: NumberTypeComponent,
        private readonly stringType: StringTypeComponent,
        private readonly functionType: FunctionTypeComponent,
        private readonly arrayOrTupleType: ArrayOrTupleTypeComponent,
        private readonly objectType: ObjectTypeComponent) {
    }

    static top = new Type(
        NullTypeComponent.top,
        UndefinedTypeComponent.top,
        BooleanTypeComponent.top,
        NumberTypeComponent.top,
        StringTypeComponent.top,
        FunctionTypeComponent.top,
        ArrayOrTupleTypeComponent.top,
        ObjectTypeComponent.top
    );

    static bottom = new Type(
        NullTypeComponent.bottom,
        UndefinedTypeComponent.bottom,
        BooleanTypeComponent.bottom,
        NumberTypeComponent.bottom,
        StringTypeComponent.bottom,
        FunctionTypeComponent.bottom,
        ArrayOrTupleTypeComponent.bottom,
        ObjectTypeComponent.bottom
    );

    excludeAll(markers: Set<string>) {
        return new Type(
            markers.has("object") ? NullTypeComponent.bottom : this.nullType,
            markers.has("undefined") ? UndefinedTypeComponent.bottom : this.undefinedType,
            markers.has("boolean") ? BooleanTypeComponent.bottom : this.booleanType,
            markers.has("number") ? NumberTypeComponent.bottom : this.numberType,
            markers.has("string") ? StringTypeComponent.bottom : this.stringType,
            markers.has("function") ? FunctionTypeComponent.bottom : this.functionType,
            markers.has("object") ? ArrayOrTupleTypeComponent.bottom : this.arrayOrTupleType,
            markers.has("object") ? ObjectTypeComponent.bottom : this.objectType
        );
    }

    includeAll(markers: Set<string>) {
        return new Type(
            markers.has("object") ? NullTypeComponent.top : this.nullType,
            markers.has("undefined") ? UndefinedTypeComponent.top : this.undefinedType,
            markers.has("boolean") ? BooleanTypeComponent.top : this.booleanType,
            markers.has("number") ? NumberTypeComponent.top : this.numberType,
            markers.has("string") ? StringTypeComponent.top : this.stringType,
            markers.has("function") ? FunctionTypeComponent.top : this.functionType,
            markers.has("object") ? ArrayOrTupleTypeComponent.top : this.arrayOrTupleType,
            markers.has("object") ? ObjectTypeComponent.top : this.objectType
        );
    }

    includeType(type: this) {
        return <this>new Type(
            this.nullType.includeType(type.nullType),
            this.undefinedType.includeType(type.undefinedType),
            this.booleanType.includeType(type.booleanType),
            this.numberType.includeType(type.numberType),
            this.stringType.includeType(type.stringType),
            this.functionType.includeType(type.functionType),
            this.arrayOrTupleType.includeType(type.arrayOrTupleType),
            this.objectType.includeType(type.objectType)
        );
    }

    isSubtypeOf(type: this) {
        return this.nullType.isSubtypeOf(type.nullType)
            && this.undefinedType.isSubtypeOf(type.undefinedType)
            && this.booleanType.isSubtypeOf(type.booleanType)
            && this.numberType.isSubtypeOf(type.numberType)
            && this.stringType.isSubtypeOf(type.stringType)
            && this.functionType.isSubtypeOf(type.functionType)
            && this.arrayOrTupleType.isSubtypeOf(type.arrayOrTupleType)
            && this.objectType.isSubtypeOf(type.objectType);
    }

    toDefinition(): string {
        if (this.nullType.isTop()
                && this.undefinedType.isTop()
                && this.booleanType.isTop()
                && this.numberType.isTop()
                && this.stringType.isTop()
                && this.functionType.isTop()
                && this.arrayOrTupleType.isTop()
                && this.objectType.isTop())
            return "{}";

        return new TypeDefinitionBuilder()
            .add(this.nullType.toDefinition())
            .add(this.undefinedType.toDefinition())
            .add(this.booleanType.toDefinition())
            .add(this.numberType.toDefinition())
            .add(this.stringType.toDefinition())
            .add(this.functionType.toDefinition())
            .add(this.arrayOrTupleType.toDefinition())
            .add(this.objectType.toDefinition())
            .toDefinition();
    }

    private update(components: {
        nullType?: NullTypeComponent,
        undefinedType?: UndefinedTypeComponent,
        booleanType?: BooleanTypeComponent,
        numberType?: NumberTypeComponent,
        stringType?: StringTypeComponent,
        functionType?: FunctionTypeComponent,
        arrayOrTupleType?: ArrayOrTupleTypeComponent,
        objectType?: ObjectTypeComponent
    }) {
        return <this>new Type(
            components.nullType || this.nullType,
            components.undefinedType || this.undefinedType,
            components.booleanType || this.booleanType,
            components.numberType || this.numberType,
            components.stringType || this.stringType,
            components.functionType || this.functionType,
            components.arrayOrTupleType || this.arrayOrTupleType,
            components.objectType || this.objectType
        );
    }

    include(value: {}): this {
        return handle<this>(value, {
            null: (value => this.update({nullType: this.nullType.include(value)})),
            undefined: (value => this.update({undefinedType: this.undefinedType.include(value)})),
            boolean: (value => this.update({booleanType: this.booleanType.include(value)})),
            number: (value => this.update({numberType: this.numberType.include(value)})),
            string: (value => this.update({stringType: this.stringType.include(value)})),
            function: (value => this.update({functionType: this.functionType.include(value)})),
            array: (value => this.update({arrayOrTupleType: this.arrayOrTupleType.include(value)})),
            object: (value => this.update({objectType: this.objectType.include(value)}))
        });
    }

    /**
     * The entire type has a parent in the lattice for every chance in any type component.
     * Loop through them in an arbitrary order.
     */
    ascendingPaths(params: [Validator, RoundUpParameters]): Iterable<{}, [this, boolean, string]> {
        return List([
            this.nullType.ascendingPaths(params).map(([typeComponent, valid, rule]) => <[this, boolean, string]>[this.update({nullType: typeComponent}), valid, rule]),
            this.undefinedType.ascendingPaths(params).map(([typeComponent, valid, rule]) => <[this, boolean, string]>[this.update({undefinedType: typeComponent}), valid, rule]),
            this.booleanType.ascendingPaths(params).map(([typeComponent, valid, rule]) => <[this, boolean, string]>[this.update({booleanType: typeComponent}), valid, rule]),
            this.numberType.ascendingPaths(params).map(([typeComponent, valid, rule]) => <[this, boolean, string]>[this.update({numberType: typeComponent}), valid, rule]),
            this.stringType.ascendingPaths(params).map(([typeComponent, valid, rule]) => <[this, boolean, string]>[this.update({stringType: typeComponent}), valid, rule]),
            this.functionType.ascendingPaths(params).map(([typeComponent, valid, rule]) => <[this, boolean, string]>[this.update({functionType: typeComponent}), valid, rule]),
            this.arrayOrTupleType.ascendingPaths(params).map(([typeComponent, valid, rule]) => <[this, boolean, string]>[this.update({arrayOrTupleType: typeComponent}), valid, rule]),
            this.objectType.ascendingPaths(params).map(([typeComponent, valid, rule]) => <[this, boolean, string]>[this.update({objectType: typeComponent}), valid, rule]),
        ]).flatMap(iterator => iterator);
    }
};