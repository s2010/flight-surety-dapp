import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace(/^http/, 'ws')));
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress, {
            defaultGas: 1500000,
            defaultGasPrice: 2000000
        });
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.gasOptions = {
            gas: 1500000,
            gasPrice: 2000000
        }

        this.flights = [{
                name: 'SaudiGulf 109',
                timestamp: Math.floor(Date.now() / 1000)
            },
            {
                name: 'SaudiGulf 108',
                timestamp: Math.floor(Date.now() / 1000)
            },
            {
                name: 'SaudiGulf 107',
                timestamp: Math.floor(Date.now() / 1000)
            }
        ];
    }

    initialize(callback) {
        let self = this;

        this.web3.eth.getAccounts(async (error, accts) => {
            try {
                self.owner = accts[0];

                await self.flightSuretyData.methods.authorizeCaller(self.flightSuretyApp.options.address).send({
                    from: self.owner,
                    ...self.gasOptions
                });

                let counter = 1;

                while (self.airlines.length < 5) {
                    self.airlines.push(accts[counter++]);
                }

                while (self.passengers.length < 5) {
                    self.passengers.push(accts[counter++]);
                }

                await self.flightSuretyApp.methods.fundAirline().send({
                    from: self.airlines[0],
                    value: self.web3.utils.toWei('10', 'ether')
                });

                for (let i = 0; i < self.flights.length; i++) {
                    await self.flightSuretyApp.methods
                        .registerFlight(self.flights[i].name, self.flights[i].timestamp)
                        .send({
                            from: self.airlines[0],
                            ...self.gasOptions
                        });
                }

                callback();
            } catch (e) {
                console.log(e);
            }
        });
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({
                from: self.owner
            }, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;

        let payload = {
            airline: self.airlines[0],
            ...flight
        }

        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.name, payload.timestamp)
            .send({
                from: self.owner,
                ...self.gasOptions
            }, (error, result) => {
                callback(error, payload);
            });
    }

    trackFlightStatus(callback) {
        this.flightSuretyApp.events.FlightStatusInfo({
            fromBlock: 0
        }, (err, event) => {
            console.log('EVENT', err, event);

            if (err) {
                console.log(err);
                callback(err);
            }

        }).on('data', event => {
            callback(null, event.returnValues);
        });
    }

    buyInsurance(flight, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .buyInsurance(self.airlines[0], flight.name, flight.timestamp)
            .send({
                from: self.passengers[0],
                value: self.web3.utils.toWei('1', 'ether'),
                ...self.gasOptions
            }, (error, result) => {
                callback(error, flight);
            });
    }
}