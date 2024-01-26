import { BaseRules, getFirstCheckError } from "@shared/Validation";
import { Accessor, createEffect, createSignal, Setter } from "solid-js";

import { api } from "./api";

export * from "./api";

type RuleResponse = Record<string, BaseRules>;

export class Validator {
    public rulesData: Accessor<RuleResponse | null>;
    public setRulesData: Setter<RuleResponse | null>;

    constructor(...rules: string[]) {
        [this.rulesData, this.setRulesData] = createSignal<RuleResponse | null>({});

        createEffect(async () => {
            await api.post("/api/common/rules", { rules }, async res => {
                const _rules: BaseRules[] = res.data.rules;
                const rules = Object.entries(_rules).map(r => ({
                    ...r[1],
                    regex: r[1].regex ? new RegExp(r[1].regex) : null
                }));

                console.log("Fetched rules", rules);
                this.setRulesData(res.data.rules);
            });
        });
    }

    public useValidator(rule: string) : [Accessor<string>, Setter<string>, Accessor<string>] {
        const [value, setValue] = createSignal<string>(null);
        const [error, setError] = createSignal<string>(null);

        // every time value changes set error to const err = getFirstCheckError(value(), rule);
        createEffect(() => {
            const err = getFirstCheckError(value(), this.rulesData()[rule]);
            setError(err); // Update the error state based on validation result
        });

        return [
            value,
            setValue,
            error
        ];
    }
}
