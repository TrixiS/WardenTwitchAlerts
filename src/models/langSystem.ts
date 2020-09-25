
export class Language {
    public readonly code: string;

    constructor(code: string, phrases: Object) {
        this.code = code;

        for (let key of Object.keys(phrases)) {
            let value = phrases[key];
            this[key] = value;
        }
    }

    [key: string]: any;
}

export class LanguageResolver {
    public readonly langs: Language[];
    private readonly defaultLang: Language;

    constructor(defaultLangCode: string, langs: Language[]) {
        this.langs = langs;

        const foundLang = this.getLangByCode(defaultLangCode);

        if (foundLang === undefined)
            throw `Can't find lang with code ${defaultLangCode}`;

        this.defaultLang = foundLang;
    }

    private getLangByCode(code: string): Language | undefined {
        return this.langs.find(l => l.code === code);
    }

    public resolve(langCode: string | undefined): Language {
        if (langCode === undefined)
            return this.defaultLang;

        const foundLang = this.getLangByCode(langCode);

        if (foundLang === undefined)
            return this.defaultLang;

        return foundLang;
    }
}
