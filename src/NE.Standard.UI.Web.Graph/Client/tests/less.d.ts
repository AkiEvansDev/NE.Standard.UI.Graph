// The one call the tests make into Less; the package ships no typings and the build needs none beyond this.
declare module "less" {
    const less: {
        render(input: string, options?: { filename?: string }): Promise<{ css: string }>;
    };

    export default less;
}
