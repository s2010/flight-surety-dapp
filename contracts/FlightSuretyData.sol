pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    struct Airline {
        string name;
        bool isRegistered;
        bool isFunded;
        uint256 fund;
    }

    struct PassengerPurchase {
        uint256 balance;
        uint256 insuranceCredit;
    }

    mapping (address => Airline) airlines;
    mapping(address => uint256) authorizedContracts;
    uint256 private airlinesCount;
    uint256 private fundedAirlinesCount;

    mapping (address => mapping(bytes32 => PassengerPurchase)) passengers;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
        (
            address _firstAirline,
            string _firstAirlineName
        )
        public
    {
        contractOwner = msg.sender;

        airlines[_firstAirline].isRegistered = true;
        airlines[_firstAirline].name = _firstAirlineName;
        airlines[_firstAirline].fund = 0;

        airlinesCount = 1;
        fundedAirlinesCount = 0;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier isAuthorizedCaller() {
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational()
        public
        view
        returns(bool)
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus
        (
            bool mode
        )
        external
        requireContractOwner
    {
        operational = mode;
    }

    function authorizeCaller(address appContract) external requireContractOwner {
        authorizedContracts[appContract] = 1;
    }

    function deauthorizeCaller(address appContract) external requireContractOwner {
        delete authorizedContracts[appContract];
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function getAirlineCount() public view returns(uint256) {
        return airlinesCount;
    }

    function getFundedAirlineCount() external view returns(uint256) {
        return fundedAirlinesCount;
    }

    function getAirline(address _airlineAddress)
        external
        view
        isAuthorizedCaller
        returns(string name, bool isRegistered, bool isFunded)
    {
        name = airlines[_airlineAddress].name;
        isRegistered = airlines[_airlineAddress].isRegistered;
        isFunded = airlines[_airlineAddress].isFunded;
    }

    function isAirline(address _airline) external view returns(bool){
        return airlines[_airline].isRegistered;
    }

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function registerAirline
        (
            address airlineAddress,
            string name
        )
        external
    {
        airlines[airlineAddress].isRegistered = true;
        airlines[airlineAddress].name = name;

        airlinesCount = airlinesCount.add(1);
    }

    function getPassengerPurchase(address passengerAddress, bytes32 flight) external view returns(uint256 balance, uint256 insuranceCredit)
    {
        balance = passengers[passengerAddress][flight].balance;
        insuranceCredit = passengers[passengerAddress][flight].insuranceCredit;
    }

   /**
    * @dev Buy insurance for a flight
    *
    */
    function buy
        (
            address passengerAddress,
            bytes32 flight
        )
        external
        payable
    {
        passengers[passengerAddress][flight] = PassengerPurchase(msg.value, 0 ether);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurance
            (
                address passengerAddress,
                uint256 amount,
                bytes32 flight
            )
            external
    {
        passengers[passengerAddress][flight].insuranceCredit = amount;
    }

    function withdraw(address passengerAddress, bytes32 flight) external {
        uint256 amount = passengers[passengerAddress][flight].insuranceCredit;

        require(amount > 0, "No insurance credit");

        passengers[passengerAddress][flight].insuranceCredit = 0;

        passengerAddress.transfer(amount);
    }
    function fundAirline(address airline) external payable {
        airlines[airline].fund = msg.value.add(airlines[airline].fund);

        if(airlines[airline].fund >= 10) {
            airlines[airline].isFunded = true;
            fundedAirlinesCount = fundedAirlinesCount.add(1);
        }
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */
    function fund
        (
        )
        public
        payable
    {
    }

    function getFlightKey
        (
            address airline,
            string memory flight,
            uint256 timestamp
        )
        pure
        internal
        returns(bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function()
        external
        payable
    {
        fund();
    }


}

