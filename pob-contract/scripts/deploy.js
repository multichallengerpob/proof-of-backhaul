// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  

  const WIT = await hre.ethers.getContractFactory("WIT");
  const wit = await WIT.deploy();

  await wit.deployed();

  console.log(
    `WIT address ${wit.address}`
  );

  const POB = await hre.ethers.getContractFactory("Pob");
  const pob = await POB.deploy(wit.address)

  await pob.deployed();

  console.log(
    `Pob address ${pob.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
