/**
 * Omit specified keys from an object and return a new object.
 *
 * Usage:
 *   const out = omit({a:1, b:2}, ['b']); // { a: 1 }
 *
 * This function is typed to return Omit<T, K> when K is a keyof T.
 */
export function omit<T, K extends keyof T>(
    obj: T,
    keys: readonly K[] | Set<K>
): Omit<T, K> {
    const result = {} as Omit<T, K>;
    const keySet: Set<K> = keys instanceof Set ? keys : new Set(keys as K[]);

    const keysInObj = Object.keys(obj as any) as Array<keyof T>;
    for (const key of keysInObj) {
        // cast via unknown to satisfy the compiler for the generic K check
        if (!keySet.has(key as unknown as K)) {
            // assign to result while keeping types (runtime assign uses any cast)
            (result as any)[key as string] = obj[key as keyof T];
        }
    }

    return result;
}

export default omit;
