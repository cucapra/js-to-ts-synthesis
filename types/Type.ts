import {List, Set} from "immutable";
import {Validator} from "../Validator";
import {handle} from "../Value";
import {ArrayOrTupleTypeComponent} from "./ArrayOrTupleTypeComponent";
import {BooleanTypeComponent} from "./BooleanTypeComponent";
import {FunctionTypeComponent} from "./FunctionTypeComponent";
import {Lattice} from "./Lattice";
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

    canRoundUp(validator: Validator, topType: Type, parameters: RoundUpParameters) {
        return this.nullType.canRoundUp(validator, topType.nullType, parameters)
            && this.undefinedType.canRoundUp(validator, topType.undefinedType, parameters)
            && this.booleanType.canRoundUp(validator, topType.booleanType, parameters)
            && this.numberType.canRoundUp(validator, topType.numberType, parameters)
            && this.stringType.canRoundUp(validator, topType.stringType, parameters)
            && this.functionType.canRoundUp(validator, topType.functionType, parameters)
            && this.arrayOrTupleType.canRoundUp(validator, topType.arrayOrTupleType, parameters)
            && this.objectType.canRoundUp(validator, topType.objectType, parameters);
    }

    roundUp(validator: Validator, parameters: RoundUpParameters): Type {
        return new Type(
            this.nullType.roundUp(validator, parameters),
            this.undefinedType.roundUp(validator, parameters),
            this.booleanType.roundUp(validator, parameters),
            this.numberType.roundUp(validator, parameters),
            this.stringType.roundUp(validator, parameters),
            this.functionType.roundUp(validator, parameters),
            this.arrayOrTupleType.roundUp(validator, parameters),
            this.objectType.roundUp(validator, parameters)
        );
    }

    /**
     * The entire type has a parent in the lattice for every chance in any type component.
     * Loop through them in an arbitrary order.
     */
    ascendingPaths(params: [Validator, RoundUpParameters]) {
        return List([
            this.nullType.ascendingPaths(params).map(t => this.update({nullType: t})),
            this.undefinedType.ascendingPaths(params).map(t => this.update({undefinedType: t})),
            this.booleanType.ascendingPaths(params).map(t => this.update({booleanType: t})),
            this.numberType.ascendingPaths(params).map(t => this.update({numberType: t})),
            this.stringType.ascendingPaths(params).map(t => this.update({stringType: t})),
            this.functionType.ascendingPaths(params).map(t => this.update({functionType: t})),
            this.arrayOrTupleType.ascendingPaths(params).map(t => this.update({arrayOrTupleType: t})),
            this.objectType.ascendingPaths(params).map(t => this.update({objectType: t})),
        ]).flatMap(iterator => iterator);
    }
};

export class TypeLattice extends Lattice<Type, [Validator, RoundUpParameters]> {
    walk(type: Type, params: [Validator, RoundUpParameters]) {
        console.log(`Current type: ${type.toDefinition()}`);
        return super.walk(type, params);
    }
}