import {
  GreetingCasing,
  GreetingOptions,
  GreetingResult,
  SupportedLanguage
} from "./types";

const LANGUAGE_TRANSLATIONS: Record<string, { salutation: string; defaultTarget: string }> = {
  en: { salutation: "Hello", defaultTarget: "World" },
  es: { salutation: "Hola", defaultTarget: "Mundo" },
  fr: { salutation: "Bonjour", defaultTarget: "Monde" },
  de: { salutation: "Hallo", defaultTarget: "Welt" },
  it: { salutation: "Ciao", defaultTarget: "Mondo" },
  pt: { salutation: "Ola", defaultTarget: "Mundo" },
  ja: { salutation: "Konnichiwa", defaultTarget: "Sekai" },
  zh: { salutation: "Ni Hao", defaultTarget: "Shijie" },
  ko: { salutation: "Annyeonghaseyo", defaultTarget: "Segye" },
  ru: { salutation: "Privet", defaultTarget: "Mir" },
  nl: { salutation: "Hallo", defaultTarget: "Wereld" },
  la: { salutation: "Salve", defaultTarget: "Mundus" }
};

/**
 * Validates whether a provided language identifier is registered in supported translations.
 * @param language The language code string to evaluate.
 * @returns Boolean indicating registration status.
 */
export function isLanguageSupported(language: string): boolean {
  const normalized = language.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(LANGUAGE_TRANSLATIONS, normalized);
}

/**
 * Retrieves the list of supported ISO language identifiers.
 * @returns Array of registered language code strings.
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(LANGUAGE_TRANSLATIONS);
}

/**
 * Produces a formatted greeting string based on provided configuration options.
 * @param options Optional configuration parameters for target, language, punctuation, and casing.
 * @returns Formatted greeting string.
 */
export function getGreeting(options?: GreetingOptions): string {
  const langKey = options?.language ? options.language.trim().toLowerCase() : "en";
  const translation = LANGUAGE_TRANSLATIONS[langKey] ?? LANGUAGE_TRANSLATIONS.en;

  const salutation = options?.prefix?.trim() || translation.salutation;
  const target = options?.target !== undefined && options.target !== null && options.target.trim().length > 0
    ? options.target.trim()
    : translation.defaultTarget;
  const punctuation = options?.punctuation !== undefined && options.punctuation !== null
    ? options.punctuation
    : "!";

  let rawGreeting = `${salutation}, ${target}${punctuation}`;

  if (options?.casing === "uppercase") {
    rawGreeting = rawGreeting.toUpperCase();
  } else if (options?.casing === "lowercase") {
    rawGreeting = rawGreeting.toLowerCase();
  }

  return rawGreeting;
}

/**
 * Creates an object containing structural elements and metadata for a greeting.
 * @param options Optional configuration parameters.
 * @returns GreetingResult containing message, constituent components, and timestamp.
 */
export function createGreeting(options?: GreetingOptions): GreetingResult {
  const langKey = options?.language ? options.language.trim().toLowerCase() : "en";
  const translation = LANGUAGE_TRANSLATIONS[langKey] ?? LANGUAGE_TRANSLATIONS.en;
  const salutation = options?.prefix?.trim() || translation.salutation;
  const target = options?.target !== undefined && options.target !== null && options.target.trim().length > 0
    ? options.target.trim()
    : translation.defaultTarget;
  const punctuation = options?.punctuation !== undefined && options.punctuation !== null
    ? options.punctuation
    : "!";
  const message = getGreeting(options);

  return {
    message,
    salutation,
    target,
    language: langKey,
    punctuation,
    timestamp: Date.now()
  };
}

/**
 * Greeter service managing state, default configuration, and invocation history.
 */
export class Greeter {
  private defaultLanguage: string = "en";
  private defaultTarget: string = "World";
  private customSalutation: string | null = null;
  private readonly history: GreetingResult[] = [];

  /**
   * Initializes a new Greeter instance.
   * @param defaultLanguage Default language identifier for greetings.
   * @param defaultTarget Default target recipient for greetings.
   */
  constructor(defaultLanguage: string = "en", defaultTarget: string = "World") {
    if (isLanguageSupported(defaultLanguage)) {
      this.defaultLanguage = defaultLanguage.trim().toLowerCase();
    }
    this.defaultTarget = defaultTarget;
  }

  /**
   * Generates a greeting for the specified recipient or uses the configured default.
   * @param target Optional recipient name.
   * @returns Formatted greeting string.
   */
  public greet(target?: string): string {
    const result = this.generateGreeting({
      target: target ?? this.defaultTarget,
      language: this.defaultLanguage,
      prefix: this.customSalutation ?? undefined
    });
    this.history.push(result);
    return result.message;
  }

  /**
   * Generates a greeting with explicit options and logs the transaction.
   * @param options Configuration options.
   * @returns Formatted greeting string.
   */
  public format(options?: GreetingOptions): string {
    const mergedOptions: GreetingOptions = {
      target: options?.target ?? this.defaultTarget,
      language: options?.language ?? this.defaultLanguage,
      punctuation: options?.punctuation ?? "!",
      casing: options?.casing ?? "standard",
      prefix: options?.prefix ?? this.customSalutation ?? undefined
    };
    const result = this.generateGreeting(mergedOptions);
    this.history.push(result);
    return result.message;
  }

  /**
   * Sets a custom salutation override replacing standard language prefixes.
   * @param salutation The custom salutation text.
   */
  public setSalutation(salutation: string): void {
    this.customSalutation = salutation.trim().length > 0 ? salutation.trim() : null;
  }

  /**
   * Retrieves the currently active custom salutation override.
   * @returns Current salutation override string or null if unassigned.
   */
  public getSalutation(): string | null {
    return this.customSalutation;
  }

  /**
   * Updates the default target recipient name.
   * @param target Target recipient name.
   */
  public setDefaultTarget(target: string): void {
    this.defaultTarget = target.trim();
  }

  /**
   * Retrieves the default target recipient name.
   * @returns Active default target string.
   */
  public getDefaultTarget(): string {
    return this.defaultTarget;
  }

  /**
   * Updates the default language code.
   * @param language ISO language identifier.
   */
  public setDefaultLanguage(language: SupportedLanguage | string): void {
    const normalized = language.trim().toLowerCase();
    if (isLanguageSupported(normalized)) {
      this.defaultLanguage = normalized;
    }
  }

  /**
   * Retrieves the default language code.
   * @returns Active default language code.
   */
  public getDefaultLanguage(): string {
    return this.defaultLanguage;
  }

  /**
   * Retrieves an immutable copy of the greeting transaction history.
   * @returns Array of GreetingResult records.
   */
  public getHistory(): GreetingResult[] {
    return [...this.history];
  }

  /**
   * Resets and clears the greeting transaction history log.
   */
  public clearHistory(): void {
    this.history.length = 0;
  }

  private generateGreeting(options: GreetingOptions): GreetingResult {
    return createGreeting(options);
  }
}
