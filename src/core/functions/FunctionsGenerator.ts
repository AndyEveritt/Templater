import { InternalFunctions } from "./internal_functions/InternalFunctions";
import { UserFunctions } from "./user_functions/UserFunctions";
import TemplaterPlugin from "main";
import { IGenerateObject } from "./IGenerateObject";
import { FrontmatterCollector, RunningConfig } from "core/Templater";
import * as obsidian_module from "obsidian";

export enum FunctionsMode {
    INTERNAL,
    USER_INTERNAL,
}

export class FunctionsGenerator implements IGenerateObject {
    public internal_functions: InternalFunctions;
    public user_functions: UserFunctions;

    constructor(private plugin: TemplaterPlugin) {
        this.internal_functions = new InternalFunctions(this.plugin);
        this.user_functions = new UserFunctions(this.plugin);
    }

    async init(): Promise<void> {
        await this.internal_functions.init();
    }

    async teardown(): Promise<void> {
        await this.internal_functions.teardown();
    }

    additional_functions(): Record<string, unknown> {
        return {
            app: this.plugin.app,
            obsidian: obsidian_module,
        };
    }

    /**
     * @param frontmatter_collector Where `tp.file.include` adds included
     * frontmatter. Without one, frontmatter is left in the included content.
     */
    async generate_object(
        config: RunningConfig,
        functions_mode: FunctionsMode = FunctionsMode.USER_INTERNAL,
        frontmatter_collector: FrontmatterCollector | null = null
    ): Promise<Record<string, unknown>> {
        const final_object = {};
        const additional_functions_object = this.additional_functions();
        const internal_functions_object =
            await this.internal_functions.generate_object(config);
        let user_functions_object = {};

        Object.assign(final_object, additional_functions_object);
        switch (functions_mode) {
            case FunctionsMode.INTERNAL:
                Object.assign(final_object, internal_functions_object);
                break;
            case FunctionsMode.USER_INTERNAL:
                user_functions_object =
                    await this.user_functions.generate_object(config);
                Object.assign(final_object, {
                    ...internal_functions_object,
                    user: user_functions_object,
                });
                break;
        }
        this.internal_functions.add_include(
            final_object,
            frontmatter_collector
        );

        return final_object;
    }
}
