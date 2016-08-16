

(function (exports) {


    exports.app = new Vue({

        // the root element that will be compiled
        el: '#skill-farming-app',

        // app initial state
        data: {
            insurancePrices: NaN,
            insurancePricesCache: {
                lastUpdated: 0,
                interval: 3600000,
            },
            skillLevels: {
                accounting: 4,
                brokerRelations: 4,
            },
            skills: {
                accounting: {
                    base: 0.02,
                    change: 0.002, // flat
                },
                brokerRelations: {
                    base: 0.03,
                    change: 0.001, // flat
                },
            },
            massRanges: {
                rookieShip: {},
                frigate: {},
                destroyer: {},
                cruiser: {},
                industrial: {},
                battleCruiser: {},
                battleShip: {},
                capital: {},
                supercapital: {},
                titan: {},
            }
        },

        /**
         * The statements in this function are executed once, as soon as the Vue app is finished loading.
         */
        ready: function() {

            // attempt to get cached insurance price information from local storage
            var cachedInsurancePrices = this.localFetch('insurancePrices');
            var cachedInsurancePricesCache = this.localFetch('insurancePricesCache');
            
            // if cached insurance prices are found
            if (cachedInsurancePrices) {
                // update the app's insurance price information
                this.insurancePrices = Object.assign({}, cachedInsurancePrices);
                this.insurancePricesCache = cachedInsurancePricesCache;
                // if insurance price information is out of date, run update
                if (Date.now() > (this.insurancePricesCache.lastUpdated + this.insurancePricesCache.interval)) {
                    this.updateInsurancePrices();
                    console.log('data out of date');
                } else {
                    console.log('data is acceptable, no update needed');
                }
            }
            // else if cached insurance prices are not found, run update
            else {
                this.updateInsurancePrices();
            }

        },

        // watchers (when any of these structures change, run their handler functions)
        watch: {
            insurancePrices: {
                deep: true,
                handler: function(val, oldVal) {
                    this.localStore('insurancePrices', val);
                },
            },
            insurancePricesCache: {
                deep: true,
                handler: function(val, oldVal) {
                    this.localStore('insurancePricesCache', val);
                },
            },
        },

        // computed properties
        computed: {

            insurancePricesRepr: function() {
                return JSON.stringify(this.insurancePrices, null, 2);
            }

        },

        // methods that implement data logic
        methods: {

            /**
             * @param {String} key Key of data to be stored in localStorage
             * @param {Object} value Data to be stored in localStorage
             */
            localStore: function(key, value) {
                localStorage.setItem(key, JSON.stringify(value));
            },

            /**
             * @param {String} key Key of a value saved in localStorage
             * @returns {Object} Contents of localStorage with specified key, parsed into JSON
             */
            localFetch: function(key) {
                return JSON.parse(localStorage.getItem(key));
            },

            /**
             * Clears the localStorage
             */
            localClear: function() {
                localStorage.clear();
            },


            /**
             * @param {Float} principal Raw price of a buy order
             * @returns {Float} Sum of the buy order's raw price and broker fee
             */
            taxedBuyOrderPrice: function(principal) {
                return principal + (principal * this.brokerRate);
            },

            /**
             * @param {Float} principal Raw price of a sell order
             * @returns {Float} Sum of the sell order's raw price, broker fee and sales tax
             */
            taxedSellOrderPrice: function(principal) {
                return principal - (principal * this.brokerRate) - (principal * this.transactionRate);
            },

            /**
             * Polls Eve Central for updated plex, extractor and injector prices
             */
            updatePrices: function() {

                var url = `https://api.eve-central.com/api/marketstat?` +
                            `typeid=${    this.id.item.plex      }&` +
                            `typeid=${    this.id.item.extractor }&` +
                            `typeid=${    this.id.item.injector  }&` +
                            `usesystem=${ this.id.system.jita    }`;

                this.$http.get(url).then((response) => {
                    // success
                    // console.log('successful eve central call');

                    // set up a parser to extract data from the returned string-formatted XML
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response.text(), 'application/xml');

                    // extract the plex price
                    this.prices.plexBuy = parseFloat(doc.getElementById(this.id.item.plex)
                                                        .getElementsByTagName('buy')[0]
                                                        .getElementsByTagName('max')[0]
                                                        .childNodes[0]
                                                        .nodeValue);

                    // extract the skill extractor price
                    this.prices.extractorBuy = parseFloat(doc.getElementById(this.id.item.extractor)
                                                             .getElementsByTagName('buy')[0]
                                                             .getElementsByTagName('max')[0]
                                                             .childNodes[0]
                                                             .nodeValue);

                    // extract the skill injector price
                    this.prices.injectorSell = parseFloat(doc.getElementById(this.id.item.injector)
                                                            .getElementsByTagName('sell')[0]
                                                            .getElementsByTagName('min')[0]
                                                            .childNodes[0]
                                                            .nodeValue);

                    // update the polling timestamp
                    this.prices.lastEveCentralPollTime = Date.now();
                }, (response) => {
                    // failure
                    // console.log('failed eve central call');
                });

            },

            /**
             * Polls CREST for updated ship insurance values
             */
            updateInsurancePrices: function() {
                var url = 'https://crest-tq.eveonline.com/insuranceprices/';

                this.$http.get(url).then((response) => {
                    // successful call
                    this.insurancePrices = Object.assign({}, response.json());
                    this.insurancePricesCache.lastUpdated = Date.now();
                    console.log('insurance prices update successful');
                }, (response) => {
                    // failed call
                    console.log('insurance prices update failed');
                });
            }

        },

    }); // end of app definition

})(window);
