/** Provider-neutral adapter contract. Implementations can wrap UPI or a gateway later. */
export class PaymentProvider {
  constructor(providerName) {
    if (new.target === PaymentProvider) throw new TypeError('PaymentProvider is an abstract adapter.');
    this.providerName = providerName;
  }

  async initiatePayment() { throw new Error(`${this.providerName} must implement initiatePayment().`); }
  async verifyPayment() { throw new Error(`${this.providerName} must implement verifyPayment().`); }
}

export class PaymentProviderRegistry {
  #providers = new Map();

  register(provider) {
    if (!(provider instanceof PaymentProvider)) throw new TypeError('Register a PaymentProvider adapter.');
    this.#providers.set(provider.providerName, provider);
  }

  get(providerName) { return this.#providers.get(providerName); }
}
