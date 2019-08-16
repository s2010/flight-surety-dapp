import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

let flightStatus = {
    10: 'On Time 👌',
    20: 'Late due to airline 😢',
    30: 'Late due to weather 🌩',
    40: 'Late due to technical diffeculties 🛠',
    50: 'Late due to other issues 🤷‍♂️'
};

let insuredFlight = [];

(async () => {

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error, result);
            display('Operational Status', 'Check if contract is operational', [{
                label: 'Operational Status',
                error: error,
                value: result
            }]);
        });


        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = insuredFlight[DOM.elid('bought-flight').selectedIndex];

            if (!flight) {
                alert('Select/register flight first 😊');
                return;
            }

            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [{
                    label: 'Fetch Flight Status',
                    error: error,
                    value: result.name + ' ' + result.timestamp
                }]);
            });
        });

        DOM.elid('buy-insurance').addEventListener('click', () => {
            let flight = contract.flights[DOM.elid('flight-number').selectedIndex];

            if (!flight) {
                alert('Select/register flight first 😊');
                return;
            }

            contract.buyInsurance(flight, (error, result) => {
                display('Buy insurance', '', [{
                    label: 'Operation',
                    error,
                    value: 'successful'
                }]);

                if (!error) {
                    insuredFlight.push(result);

                    let option = document.createElement('option');
                    option.innerHTML = result.name;

                    DOM.elid('bought-flight').appendChild(option);
                }
            });
        });

        contract.trackFlightStatus((error, args) => {
            display('Flight Status Update', '', [{
                label: args ? args.flight : '',
                error: error,
                value: args ? flightStatus[args.status] : ''
            }]);
        });

    });


})();


function display(title, description, results) {

    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({
            className: 'row'
        }));
        row.appendChild(DOM.div({
            className: 'col-sm-4 field'
        }, result.label));
        row.appendChild(DOM.div({
            className: 'col-sm-8 field-value'
        }, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}