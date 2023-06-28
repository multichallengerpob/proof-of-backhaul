const ethers = require("ethers");

class PoB {

  /*
  ** url: URL link to the chain json rpc api
  ** abi: ABI interface of PoB contract(sample after compilation: artifacts/contracts/Pob.sol/Pob.json)
  ** privKey: wallet private key
  ** PoBAddress: PoB contract address deployed on the chain
  */
  constructor(url, abi, privKey, PoBAddress) {
    this.pob = new ethers.Contract(
      PoBAddress,
      abi,
      new ethers.Wallet(
        privKey,
        new ethers.providers.JsonRpcProvider(url)
      )
    );
  }

  /*
  ** INPUT:
  ** prover: prover address
  ** cc: challenger coordinator address
  ** amount: uint
  ** num_accounts: uint
  ** bandwith: uint
  ** timeout: uint
  *****************************************
  ** EXPECTED OUTPUT:
  ** id: BigNumber
  */
  async startChallenge(prover, cc, amount, num_accounts, bandwidth, timeout) {
    const result = await this.pob.startChallenge(prover, cc, amount, num_accounts, bandwidth, timeout);
    let receipt = await this.pob.provider.getTransactionReceipt(result["hash"]);
    let id;
    for (const log of receipt.logs) {
      try {
        const logDescription = this.pob.interface.parseLog({
          data: log.data,
          topics: log.topics
        });
        if (logDescription.name === "PobCreated") {
          id = logDescription.args[0]
        }
      } catch(err) {
        continue;
      }
    }
    return id;
  }

  /*
  ** INPUT:
  ** challengers: list challenger addresses
  ** id: uint
  *****************************************
  ** EXPECTED OUTPUT: 
  ** receipt: https://docs.ethers.org/v5/api/utils/abi/interface/#Result
  */
  async endChallenge(challengers, id) {
    const receipt = await this.pob.endChallenge(challengers, id);
    return receipt;
  }

  /*
  ** INPUT:
  ** id: uint
  *****************************************
  ** EXPECTED OUTPUT:
  ** detail: PoB struct
  */
  async getPoB(id) {
    const receipt = await this.pob.getPob(id);
    return receipt["value"]
  }

  /*
  ** INPUT:
  ** addr: address
  *****************************************
  ** EXPECTED OUTPUT:
  ** balance: BigNumber
  */
  async getBalance(addr) {
    const receipt = await this.pob.getBalance(addr);
    return receipt["value"];
  }

  /*
  ** INPUT:
  ** id: uint
  *****************************************
  ** EXPECTED OUTPUT: 
  ** receipt: https://docs.ethers.org/v5/api/utils/abi/interface/#Result
  */
  async timeout(id) {
    const receipt = await this.pob.timeout(id);
    return receipt;
  }

  /*
  ** INPUT:
  ** id: uint
  *****************************************
  ** EXPECTED OUTPUT: 
  ** receipt: https://docs.ethers.org/v5/api/utils/abi/interface/#Result
  */
  async withdraw(id) {
    const receipt = await this.pob.withdraw(id);
    return receipt;
  }

}