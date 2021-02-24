import {
    Asset,
    AssetDescriptor,
    Attribute,
    AttributeDescriptor,
    AttributeEvent,
    AttributePredicate,
    GeofencePredicate,
    JsonRulesetDefinition,
    LogicGroup,
    MetaHolder,
    NameHolder,
    NameValueHolder,
    PushNotificationMessage,
    RuleActionUnion,
    RuleCondition,
    ValueDescriptor,
    ValueDescriptorHolder,
    ValueFormat,
    WellknownMetaItems,
    ValueConstraint,
    AbstractNameValueDescriptorHolder,
    MetaItemDescriptor,
    ValueFormatStyleRepresentation,
} from "@openremote/model";
import i18next from "i18next";
import Qs from "qs";
import {AssetModelUtil} from "./index";
import moment from "moment";

export class Deferred<T> {

    protected _resolve!: (value: T | PromiseLike<T>) => void;
    protected _reject!: (reason?: any) => void;
    protected _promise: Promise<T>;

    get resolve() {
        return this._resolve;
    }

    get reject() {
        return this._reject;
    }

    get promise() {
        return this._promise;
    }

    constructor() {
        this._promise = new Promise<T>((resolve1, reject1) => {
            this._resolve = resolve1;
            this._reject = reject1;
        });
        Object.freeze(this);
    }
}

export interface GeoNotification {
    predicate: GeofencePredicate;
    notification?: PushNotificationMessage;
}

export function getQueryParameters(queryStr: string): any {
    return Qs.parse(queryStr, {ignoreQueryPrefix: true});
}

export function getQueryParameter(queryStr: string, parameter: string): any | undefined {
    const parsed = getQueryParameters(queryStr);
    return parsed ? parsed[parameter] : undefined;
}

export function getGeoNotificationsFromRulesSet(rulesetDefinition: JsonRulesetDefinition): GeoNotification[] {

    const geoNotifications: GeoNotification[] = [];

    rulesetDefinition.rules!.forEach((rule) => {

        if (rule.when && rule.then && rule.then.length > 0) {
            const geoNotificationMap = new Map<string, GeoNotification[]>();
            addGeofencePredicatesFromRuleCondition(rule.when, 0, geoNotificationMap);

            if (geoNotificationMap.size > 0) {
                rule.then.forEach((ruleAction) => addPushNotificationsFromRuleAction(ruleAction, geoNotificationMap));
            }
            for (const geoNotificationsArr of geoNotificationMap.values()) {
                geoNotificationsArr.forEach((geoNotification) => {
                    if (geoNotification.notification) {
                        geoNotifications.push(geoNotification);
                    }
                });
            }
        }
    });

    return geoNotifications;
}

function addGeofencePredicatesFromRuleCondition(ruleCondition: LogicGroup<RuleCondition> | undefined, index: number, geoNotificationMap: Map<string, GeoNotification[]>) {
    if (!ruleCondition) {
        return;
    }
    const items: any = [];
    if (ruleCondition.groups) {
        ruleCondition.groups.forEach((ruleGroup) => {
            if (ruleGroup.items) {
                ruleGroup.items.forEach((ruleTrigger) => {
                    items.push(ruleTrigger)
                });
            }
        });
    }

    if (ruleCondition.items) {
        ruleCondition.items.forEach((ruleTrigger) => {
            items.push(ruleTrigger)
        });

    }
    if (items) {
        items.forEach((ruleTrigger: any) => {
            if (ruleTrigger.assets && ruleTrigger.assets.attributes) {
                const geoNotifications: GeoNotification[] = [];
                addGeoNotificationsFromAttributePredicateCondition(ruleTrigger.assets.attributes, geoNotifications);
                if (geoNotifications.length > 0) {
                    const tagName = ruleTrigger.tag || index.toString();
                    geoNotificationMap.set(tagName, geoNotifications);
                }
            }
        });
    }
}

function addGeoNotificationsFromAttributePredicateCondition(attributeCondition: LogicGroup<AttributePredicate> | undefined, geoNotifications: GeoNotification[]) {
    if (!attributeCondition) {
        return;
    }

    attributeCondition.items!.forEach((predicate) => {
        if (predicate.value && (predicate.value.predicateType === "radial" || predicate.value!.predicateType === "rect")) {
            geoNotifications.push({
                predicate: predicate.value as GeofencePredicate
            });
        }
    });

    if (attributeCondition.groups) {
        attributeCondition.groups.forEach((condition) => addGeoNotificationsFromAttributePredicateCondition(condition, geoNotifications));
    }
}

function addPushNotificationsFromRuleAction(ruleAction: RuleActionUnion, geoPredicateMap: Map<string, GeoNotification[]>) {
    if (ruleAction && ruleAction.action === "notification") {
        if (ruleAction.notification && ruleAction.notification.message && ruleAction.notification.message.type === "push") {
            // Find applicable targets
            const target = ruleAction.target;
            if (target && target.conditionAssets) {
                const geoNotifications = geoPredicateMap.get(target.conditionAssets);
                if (geoNotifications) {
                    geoNotifications.forEach((geoNotification) => {
                        geoNotification.notification = ruleAction.notification!.message as PushNotificationMessage;
                    });
                }
            } else {
                // Applies to all LHS rule triggers
                for (const geoNotifications of geoPredicateMap.values()) {
                    geoNotifications.forEach((geoNotification) => {
                        geoNotification.notification = ruleAction.notification!.message as PushNotificationMessage;
                    });
                }
            }
        }
    }
}

const TIME_DURATION_REGEXP = /([+-])?((\d+)[Dd])?\s*((\d+)[Hh])?\s*((\d+)[Mm]$)?\s*((\d+)[Ss])?\s*((\d+)([Mm][Ss]$))?\s*((\d+)[Ww])?\s*((\d+)[Mm][Nn])?\s*((\d+)[Yy])?/;

export function isTimeDuration(time?: string): boolean {
    if (!time) {
        return false;
    }

    time = time.trim();

    return time.length > 0
        && (TIME_DURATION_REGEXP.test(time)
            || isTimeDurationPositiveInfinity(time)
            || isTimeDurationNegativeInfinity(time));
}

export function isTimeDurationPositiveInfinity(time?: string): boolean {
    time = time != null ? time.trim() : undefined;
    return "*" === time || "+*" === time;
}

export function isTimeDurationNegativeInfinity(time?: string): boolean {
    time = time != null ? time.trim() : undefined;
    return "-*" === time;
}

export function isObject(object: any): boolean {
    if (!!object) {
        return typeof object === "object";
    }
    return false;
}

export function isFunction(object: any): boolean {
    return !!(object && object.constructor && object.call && object.apply);
}

export function objectsEqual(obj1?: any, obj2?: any, deep: boolean = true): boolean {
    if (obj1 === null || obj1 === undefined || obj2 === null || obj2 === undefined) {
        return obj1 === obj2;
    }
    // after this just checking type of one would be enough
    if (obj1.constructor !== obj2.constructor) {
        return false;
    }
    // if they are functions, they should exactly refer to same one (because of closures)
    if (obj1 instanceof Function) {
        return obj1 === obj2;
    }
    // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
    if (obj1 instanceof RegExp) {
        return obj1 === obj2;
    }
    if (obj1 === obj2 || obj1.valueOf() === obj2.valueOf()) {
        return true;
    }
    if (Array.isArray(obj1) && obj1.length !== obj2.length) {
        return false;
    }

    // if they are dates, they must had equal valueOf
    if (obj1 instanceof Date) {
        return false;
    }

    // if they are strictly equal, they both need to be object at least
    if (!(obj1 instanceof Object)) {
        return false;
    }
    if (!(obj2 instanceof Object)) {
        return false;
    }

    if (deep) {
        // recursive object equality check
        const p = Object.keys(obj1);
        return Object.keys(obj2).every((i) => {
                return p.indexOf(i) !== -1;
            }) &&
            p.every((i) => {
                return objectsEqual(obj1[i], obj2[i]);
            });
    }

    return false;
}

export function arrayRemove<T>(arr: T[], item: T) {
    if (arr.length === 0) {
        return;
    }
    const index = arr.indexOf(item);
    if (index >= 0) {
        arr.splice(index, 1);
    }
}

export function camelCaseToSentenceCase(str: string): string {
    return str.split(/([A-Z]|\d)/).map((v, i, arr) => {
        // If first block then capitalise 1st letter regardless
        if (!i) return v.charAt(0).toUpperCase() + v.slice(1);
        // Skip empty blocks
        if (!v) return v;
        // Underscore substitution
        if (v === '_') return " ";
        // We have a capital or number
        if (v.length === 1 && v === v.toUpperCase()) {
            const previousCapital = !arr[i-1] || arr[i-1] === '_';
            const nextWord = i+1 < arr.length && arr[i+1] && arr[i+1] !== '_';
            const nextTwoCapitalsOrEndOfString = i+3 > arr.length || !arr[i+1] && !arr[i+3];
            // Insert space
            if (!previousCapital || nextWord) v = " " + v;
            // Start of word or single letter word
            if (nextWord || (!previousCapital && !nextTwoCapitalsOrEndOfString)) v = v.toLowerCase();
        }
        return v;
    }).join("").trim();
}

export function stringMatch(needle: string, haystack: string): boolean {

    if (haystack === needle) {
        return true;
    }

    const startsWith = needle.endsWith("*");
    const endsWith = !startsWith && needle.startsWith("*");
    const regExp = !startsWith && !endsWith && needle.startsWith("^") && needle.endsWith("$")

    if (startsWith && haystack.startsWith(needle.substr(0, needle.length - 1))) {
        return true;
    }

    if (endsWith && haystack.endsWith(needle.substr(1))) {
        return true;
    }

    if (regExp) {
        try {
            const regexp = new RegExp(needle);
            return regexp.test(haystack);
        } catch (e) {
            console.error("Failed to compile needle as a RegExp: " + e);
        }
    }

    return false;
}

export function capitaliseFirstLetter(str: string | undefined) {
    if (!str) {
        return;
    }
    if (str.length === 1) {
        return str.toUpperCase();
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function enumContains(enm: object, val: string): boolean {
    return enm && Object.values(enm).includes(val);
}

export function getEnumKeyAsString(enm: object, val: string): string {
    // @ts-ignore
    const key = Object.keys(enm).find((k) => enm[k] === val);
    return key!;
}

/* For a given date, get the ISO week number
 *
 * Based on information at:
 *
 *    http://www.merlyn.demon.co.uk/weekcalc.htm#WNR
 *
 * Algorithm is to find nearest thursday, it's year
 * is the year of the week number. Then get weeks
 * between that date and the first day of that year.
 *
 * Note that dates in one year can be weeks of previous
 * or next year, overlap is up to 3 days.
 *
 * e.g. 2014/12/29 is Monday in week  1 of 2015
 *      2012/1/1   is Sunday in week 52 of 2011
 */
export function getWeekNumber(date: Date): number {
    // Copy date so don't modify original
    date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
    // Get first day of year
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil(( ( ((date.getTime() - yearStart.getTime()) / 86400000) + 1)/7));
    // Return array of year and week number
    return weekNo;
}

export function getMetaValue(name: string | NameHolder, attribute: Attribute<any> | undefined, descriptor?:  ValueDescriptorHolder | ValueDescriptor | string): any | undefined {
    const metaName = typeof name === "string" ? name : (name as NameHolder).name!;

    if (attribute && attribute.meta && attribute.meta.hasOwnProperty(metaName)) {
        return attribute.meta[metaName];
    }

    if (descriptor && (descriptor as MetaHolder).meta) {
        return (descriptor as MetaHolder).meta![metaName];
    }
}

export function hasMetaItem(name: string | NameHolder, attribute: Attribute<any> | undefined, descriptor?: AttributeDescriptor | string): boolean {
    const metaName = typeof name === "string" ? name : (name as NameHolder).name!;

    if (attribute && attribute.meta && attribute.meta.hasOwnProperty(metaName)) {
        return true;
    }

    if (descriptor && (descriptor as MetaHolder).meta && (descriptor as MetaHolder).meta!.hasOwnProperty(metaName)) {
        return true;
    }

    return false;
}

export function getAssetTypeLabel(type: string | AssetDescriptor | undefined): string {
    if (typeof type === "string") {
        type = AssetModelUtil.getAssetDescriptor(type);
    }
    if (!type) {
        return "";
    }
    return i18next.t("label.asset." + type.name, {defaultValue: camelCaseToSentenceCase(type.name!)});
}

export function getValueDescriptorLabel(descriptor: ValueDescriptor | string): string {
    const name = (typeof(descriptor) === "string" ? descriptor : descriptor.name);
    return i18next.t("label.value." + name, {defaultValue: camelCaseToSentenceCase(name || "")});
}

export function getAllowedValueLabel(allowedValue: string, fallback?: string): string | undefined {
    if (!allowedValue) {
        return;
    }

    return i18next.t("label.allowedValue." + allowedValue, {defaultValue: fallback || camelCaseToSentenceCase(allowedValue || "")});
}

export function getMetaItemNameValueHolder(metaNameOrDescriptor: MetaItemDescriptor | string, value: any): NameValueHolder<any> {
    const descriptor = typeof metaNameOrDescriptor === "string" ? AssetModelUtil.getMetaItemDescriptor(metaNameOrDescriptor)! : metaNameOrDescriptor;

    return {
        name: descriptor.name,
        type: descriptor.type,
        value: value
    };
}

export function getAttributeLabel(attribute: Attribute<any> | undefined, descriptor: AttributeDescriptor | undefined, assetType: string | undefined, showUnits: boolean, fallback?: string): string {
    return getValueHolderLabel(attribute, descriptor, assetType, showUnits, true, fallback);
}

export function getMetaLabel(metaItem: NameValueHolder<any> | undefined, descriptor: MetaItemDescriptor | string, assetType: string | undefined, showUnits: boolean, fallback?: string): string {
    const metaValueHolder = metaItem || getMetaItemNameValueHolder(descriptor, null);
    return getValueHolderLabel(metaValueHolder, descriptor, assetType, showUnits, false, fallback);
}

function getValueHolderLabel(nameValueHolder: NameValueHolder<any> | undefined, descriptor: AbstractNameValueDescriptorHolder | string | undefined, assetType: string | undefined, showUnits: boolean, isAttribute: boolean, fallback?: string): string {

    let label = doStandardTranslationLookup(WellknownMetaItems.LABEL, nameValueHolder, descriptor, assetType, isAttribute);
    let unitsStr = "";

    if (!label) {
        // Look in meta if it exists
        label = getMetaValue(WellknownMetaItems.LABEL, nameValueHolder as Attribute<any>, descriptor && (descriptor as MetaHolder).meta ? descriptor as AttributeDescriptor : undefined) as string;
    }

    if (showUnits) {
        const units: string[] | undefined = getValueFormatConstraintOrUnits(WellknownMetaItems.UNITS, nameValueHolder, descriptor, assetType, isAttribute);
        unitsStr = resolveUnits(units);
    }

    if (!label) {
        const name = nameValueHolder ? nameValueHolder.name! : descriptor ? typeof descriptor === "string" ? descriptor : descriptor.name : undefined;
        label = fallback || (name ? camelCaseToSentenceCase(name) : undefined);
    }

    return label ? label + (unitsStr ? " (" + unitsStr + ")" : "") : unitsStr;
}


export function getAttributeValueAsString(attribute: Attribute<any>, descriptor: AttributeDescriptor | string | undefined, assetType: string | undefined, showUnits: boolean, fallback?: string): string {
    return getValueHolderValueAsString(attribute, descriptor, assetType, showUnits, true, fallback);
}

export function getMetaValueAsString(metaItem: NameValueHolder<any> | undefined, descriptor: MetaItemDescriptor | string, assetType: string | undefined, showUnits: boolean, fallback?: string): string {
    const metaValueHolder = metaItem || getMetaItemNameValueHolder(descriptor, null);
    return getValueHolderValueAsString(metaValueHolder, descriptor, assetType, showUnits, false, fallback);
}

function getValueHolderValueAsString(nameValueHolder: NameValueHolder<any> | undefined, descriptor: AbstractNameValueDescriptorHolder | string | undefined, assetType: string | undefined, showUnits: boolean, isAttribute: boolean, fallback?: string): string {

    let valueStr = getValueAsString(nameValueHolder ? nameValueHolder.value : undefined, () => getValueFormatConstraintOrUnits(WellknownMetaItems.FORMAT, nameValueHolder, descriptor, assetType, isAttribute), undefined, fallback);

    if (showUnits) {
        const units: string[] | undefined = getValueFormatConstraintOrUnits(WellknownMetaItems.UNITS, nameValueHolder, descriptor, assetType, isAttribute);
        valueStr = resolveUnits(units, valueStr);
    }

    return valueStr;
}

export function getValueAsString(value: any, formatProvider: () => ValueFormat | undefined, language?: string, fallback?: string): string {
    let valueStr = "";

    if (value === null || typeof(value) === "undefined") {
        valueStr = fallback || "";
    } else {
        if (typeof(value) === "string") {
            valueStr = value;
        } else if (typeof(value) === "number" || typeof(value) === "boolean" || value instanceof Date) {

            const format = formatProvider && formatProvider();

            if (format) {
                if (typeof(value) === "number") {
                    if (format.asBoolean) {
                        value = !!value;
                    } else if (format.asDate) {
                        // Assume UNIX timestamp in ms
                        const offset = (new Date()).getTimezoneOffset() * 60000;
                        value = new Date(value - offset);
                    }
                } else if (typeof(value) === "boolean" && format.asNumber) {
                    value = value ? 1 : 0;
                }

                switch (typeof(value)) {
                    case "number":
                        valueStr = new Intl.NumberFormat(language || i18next.language, format).format(value);
                        break;
                    case "boolean":
                        if (format.asOnOff) {
                            valueStr = value ? i18next.t("on") : i18next.t("off");
                        }
                        if (format.asOpenClosed) {
                            valueStr = value ? i18next.t("open") : i18next.t("closed");
                        }
                        if (format.asPressedReleased) {
                            valueStr = value ? i18next.t("pressed") : i18next.t("released");
                        }
                        break;
                    case "object": // Date instance
                        // Special handling for some format options
                        if (format.momentJsFormat) {
                            valueStr = moment(value).format(format.momentJsFormat);
                        } else if (format.iso8601) {
                            valueStr = value.toISOString();
                        } else if (format.week) {
                            const weekNo = getWeekNumber(value);
                            valueStr = format.week === ValueFormatStyleRepresentation.DIGIT_2 ? String(weekNo).padStart(2,"0") : Number(weekNo).toString(10);
                        } else {
                            valueStr = new Intl.DateTimeFormat(language || i18next.language, format).format(value);
                        }
                        break;
                }
            } else {
                valueStr = Object(value).toString();
            }
        }
    }

    return valueStr;
}

/**
 * Resolve supplied units using current translation locale; and optionally apply the units to the supplied value (this
 * is useful for units containing currency which in some locales is prefixed to the value e.g. £0.00 kW/hr rather than
 * 0.00 £kW/hr)
 */
export function resolveUnits(units: string[] | undefined, valueStr?: string): string {
    if (!units) {
        return "";
    }
    if (!valueStr) {
        valueStr = "";
    }

    const unitsStr = units.map((unit, index) => {
        if (unit.length === 3 && unit.toUpperCase() === unit) {
            // This is a currency code - use Intl API to find the symbol
            const parts = new Intl.NumberFormat(i18next.language, {currency: unit, style: "currency"}).formatToParts();
            // Check whether it goes before or after the value
            if (index === 0 && parts[0].type === "currency") {
                if (valueStr) {
                    valueStr = parts[0].value + valueStr;
                } else {
                    return parts[0].value;
                }
            } else {
                return (parts[0].type === "currency" ? parts[0].value : parts[parts.length-1].value);
            }
        } else {
            return i18next.t(["units." + unit, "or:units." + unit]);
        }
    }).join("");

    return valueStr.length > 0 ? (valueStr + " " + unitsStr) : unitsStr;
}

/**
 * Looks for {@link ValueConstraint[]} for the specified {@link Attribute} (see {@link getValueFormatConstraintOrUnits})
 */
export function getAttributeValueConstraints(attribute: Attribute<any> | undefined, descriptor: AttributeDescriptor | string | undefined, assetType: string | undefined): ValueConstraint[] | undefined {
    return getValueFormatConstraintOrUnits(WellknownMetaItems.CONSTRAINTS, attribute, descriptor, assetType, true);
}

/**
 * Looks for {@link ValueConstraint[]} for the specified {@link NameValueHolder} (see {@link getValueFormatConstraintOrUnits})
 */
export function getMetaValueConstraints(metaItem: NameValueHolder<any> | undefined, descriptor: MetaItemDescriptor | string, assetType: string | undefined): ValueConstraint[] | undefined {
    const metaValueHolder = metaItem || getMetaItemNameValueHolder(descriptor, null);
    return getValueFormatConstraintOrUnits(WellknownMetaItems.CONSTRAINTS, metaValueHolder, descriptor, assetType, false);
}

/**
 * Looks for units string[] for the specified {@link Attribute} (see {@link getValueFormatConstraintOrUnits})
 */
export function getAttributeUnits(attribute: Attribute<any> | undefined, descriptor: AttributeDescriptor | ValueDescriptor | string | undefined, assetType: string | undefined): string[] | undefined {
    return getValueFormatConstraintOrUnits(WellknownMetaItems.UNITS, attribute, descriptor, assetType, true);
}

/**
 * Looks for units string[] for the specified {@link MetaItem} (see {@link getValueFormatConstraintOrUnits})
 */
export function getMetaUnits(metaItem: NameValueHolder<any> | undefined, descriptor: MetaItemDescriptor | string, assetType: string | undefined): string[] | undefined {
    const metaValueHolder = metaItem || getMetaItemNameValueHolder(descriptor, null);
    return getValueFormatConstraintOrUnits(WellknownMetaItems.UNITS, metaValueHolder, descriptor, assetType, false);
}

/**
 * Looks for a {@link ValueFormat} for the specified {@link Attribute} (see {@link getValueFormatConstraintOrUnits})
 */
export function getAttributeValueFormat(attribute: Attribute<any> | undefined, descriptor: AttributeDescriptor | string | undefined, assetType: string | undefined): ValueFormat | undefined {
    return getValueFormatConstraintOrUnits(WellknownMetaItems.FORMAT, attribute, descriptor, assetType, true);
}

/**
 * Looks for a {@see ValueFormat} for the specified {@link MetaItem} (see {@link getValueFormatConstraintOrUnits})
 */
export function getMetaValueFormat(metaItem: NameValueHolder<any> | undefined, descriptor: MetaItemDescriptor | string, assetType: string | undefined): ValueFormat | undefined {
    const metaValueHolder = metaItem || getMetaItemNameValueHolder(descriptor, null);
    return getValueFormatConstraintOrUnits(WellknownMetaItems.FORMAT, metaValueHolder, descriptor, assetType, false);
}

/**
 * Looks for the requested {@link ValueFormat}, {@link ValueConstraint[]} or units string[] defined in the translation
 * file in several locations (see {@link doStandardTranslationLookup}).
 * <p>
 * If no value is found in translation files then the standard resolution is used by looking at the nameValueHolder and/or
 * the provided descriptor(s); the resolution order is:
 * {@link NameValueHolder}, {@link ValueDescriptorHolder}, {@link ValueDescriptor}, the first value encountered will be
 * returned; with the exception of {@link ValueFormat} which are merged in reverse priority order.
 */
function getValueFormatConstraintOrUnits<T>(lookup: WellknownMetaItems.FORMAT | WellknownMetaItems.UNITS | WellknownMetaItems.CONSTRAINTS, nameValueHolder: NameValueHolder<any> | string | undefined, descriptor: AbstractNameValueDescriptorHolder | string | undefined, assetType: string | undefined, isAttribute: boolean): T | undefined {

    let matched: T | undefined;
    const formats: ValueFormat[] = [];
    
    const name = nameValueHolder && typeof nameValueHolder === "string" ? nameValueHolder : nameValueHolder ? (nameValueHolder as NameHolder).name : descriptor ? typeof (descriptor) === "string" ? descriptor : descriptor.name : undefined;
    const str = doStandardTranslationLookup(lookup, name, descriptor, assetType, isAttribute);
    if (str) {
        matched = JSON.parse(str) as T;
        if (matched) {
            if (lookup === WellknownMetaItems.FORMAT) {
                formats.push(matched);
            } else {
                return matched;
            }
        }
    }

    // Look in meta
    if (nameValueHolder && (nameValueHolder as MetaHolder).meta) {
        matched = getMetaValue(lookup, nameValueHolder as Attribute<any>, descriptor) as T;

        if (matched) {
            if (lookup === WellknownMetaItems.FORMAT) {
                formats.push(matched);
            } else {
                return matched;
            }
        }
    }

    if (descriptor && typeof(descriptor) !== "string" && (descriptor as any).hasOwnProperty(lookup)) {
        matched = (descriptor as any)[lookup] as T;
        if (lookup === WellknownMetaItems.FORMAT) {
            formats.push(matched);
        } else {
            return matched;
        }
    }

    if (descriptor && (descriptor as AbstractNameValueDescriptorHolder).type) {
        const valueDescriptor = AssetModelUtil.getValueDescriptor((descriptor as AbstractNameValueDescriptorHolder).type);
        matched = (valueDescriptor as any)[lookup] as T;
        if (lookup === WellknownMetaItems.FORMAT) {
            formats.push(matched);
        } else {
            return matched;
        }
    }

    if (lookup !== WellknownMetaItems.FORMAT || formats.length === 0) {
        return matched;
    }
    
    let mergedFormat: ValueFormat = {};
    formats.reverse().forEach((format) => {
        mergedFormat = {...mergedFormat,...format};
    })
    
    return mergedFormat as T;
}

/**
 * Looks up the requested lookup in several keys, for example lookup=label, name=custom, isAttribute=true, assetType=ThingAsset,
 * descriptorType=number:
 * <ol>
 *     <li>label.attribute.ThingAsset.custom</li>
 *     <li>label.attribute.number.custom</li>
 *     <li>label.attribute.number</li>
 */
function doStandardTranslationLookup(lookup: WellknownMetaItems.LABEL | WellknownMetaItems.UNITS | WellknownMetaItems.FORMAT | WellknownMetaItems.CONSTRAINTS, nameValueHolder: NameValueHolder<any> | string | undefined, valueHolderDescriptor: AbstractNameValueDescriptorHolder | string | undefined, assetType: string | undefined, isAttribute: boolean, fallback?: string): string | undefined {

    // Look in translation files for an override in multiple keys e.g.
    //  format.ThingAsset.[attribute|meta].custom (look for valueFormat where custom is meta item or attribute name)
    //  format.Duration (where Duration is the ValueDescriptor type)
    //  units.BuildingAsset.attribute.temperature
    let name: string | undefined;

    if (nameValueHolder) {
        name = typeof nameValueHolder === "string" ? nameValueHolder : nameValueHolder.name;
    } else if (valueHolderDescriptor) {
        name = typeof (valueHolderDescriptor) === "string" ? valueHolderDescriptor : valueHolderDescriptor.name;
    }

    if (!name) {
        return;
    }

    const lookups = [];
    const prefix = lookup + "." + (isAttribute ? "attribute" : "meta") + ".";

    if (assetType) {
        lookups.push(prefix + assetType + "." + name);
    }

    if (valueHolderDescriptor && typeof (valueHolderDescriptor) !== "string") {
        lookups.push(prefix + valueHolderDescriptor.type + "." + name);
        lookups.push(prefix + valueHolderDescriptor.type);
    }

    lookups.push(prefix + name);

    if (lookups.length > 0) {
        return i18next.t(lookups, {defaultValue: fallback || ""});
    }
}

/**
 * Immutable update of an asset using the supplied attribute event
 */
export function updateAsset(asset: Asset, event: AttributeEvent): Asset {

    const attributeName = event.attributeState!.ref!.name!;

    if (asset.attributes) {
        if (event.attributeState!.deleted) {
            delete asset.attributes![attributeName];
        } else {
            const attribute = asset.attributes[attributeName];
            if (attribute) {
                attribute.value = event.attributeState!.value;
                attribute.timestamp = event.timestamp;
            }
        }
    }

    return Object.assign({}, asset);
}

export function loadJs(url: string) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        script.addEventListener('load', (e) => resolve(e), false);
        script.addEventListener('error', (e) => reject(e), false);
        document.body.appendChild(script);
    });
};

export function sortByNumber<T>(valueExtractor: (item: T) => number): (a: T, b: T) => number {
    return (a, b) => {
        const v1 = valueExtractor(a);
        const v2 = valueExtractor(b);

        if (!v1 && !v2) {
            return 0;
        }
        if (v1 && !v2) {
            return 1;
        }
        if (!v1 && v2) {
            return -1;
        }
        return v1 - v2;
    };
}

export function sortByString<T>(valueExtractor: (item: T) => string): (a: T, b: T) => number {
    return (a, b) => {
        const v1 = valueExtractor(a);
        const v2 = valueExtractor(b);

        if (!v1 && !v2) {
            return 0;
        }
        if (v1 && !v2) {
            return 1;
        }
        if (!v1 && v2) {
            return -1;
        }
        return v1.localeCompare(v2);
    };
}

export interface RequestEventDetail<T> {
    allow: boolean;
    detail: T;
}

export function dispatchCancellableEvent<T>(target: EventTarget, event: CustomEvent<RequestEventDetail<T>>) {
    const deferred = new Deferred<RequestEventDetail<T>>();
    target.dispatchEvent(event);
    window.setTimeout(() => {
        deferred.resolve(event.detail);
    });

    return deferred.promise;
}
