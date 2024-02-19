import { BaseRules, getFirstCheckError } from "@shared/Validation";
import { Accessor, createEffect, createSignal, Setter } from "solid-js";

import { apiv2 } from "./apiv2";

export * from "./api";

type RuleResponse = Record<string, BaseRules>;

export class Validator {
    public rulesData: Accessor<RuleResponse | null>;
    public setRulesData: Setter<RuleResponse | null>;

    constructor(...rules: string[]) {
        [this.rulesData, this.setRulesData] = createSignal<RuleResponse>({});

        createEffect(() => {
            console.log("Fetching rules (Validator effect)");
            const getRules = apiv2.createAPIMethod<
                { rules: string[] },
                { rules: RuleResponse }
            >({
                method: "POST",
                url: "/api/common/rules"
            });

            getRules.call({ rules }, async res => {
                const rules = Object.fromEntries(Object.entries(res.data.rules).map(([key, value]) => [
                    key,
                    {
                        ...value,
                        regex: value.regex ? new RegExp(value.regex) : null
                    }
                ]));

                this.setRulesData(rules);
                console.log("Rules fetched:", this.rulesData());
            });

            // api.post("/api/common/rules", { rules }, async res => {
            //     console.log("rules:", res);
            //     const _rules: BaseRules[] = res.data.rules;
            //     const rules = Object.entries(_rules).map(r => ({
            //         ...r[1],
            //         regex: r[1].regex ? new RegExp(r[1].regex) : null
            //     }));

            //     console.log("Fetched rules", rules);
            //     this.setRulesData(res.data.rules);
            //     console.log("rulesData", this.rulesData());
            // });
        });
    }

    public useValidator(rule: string, defaultValue: string = null) : [Accessor<string>, Setter<string>, Accessor<string>] {
        const [value, setValue] = createSignal<string>(defaultValue);
        const [error, setError] = createSignal<string>(null);

        // every time value changes set error to const err = getFirstCheckError(value(), rule);
        createEffect(() => {
            console.log("rulesData", this.rulesData());
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
