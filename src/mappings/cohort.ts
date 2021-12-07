/* eslint-disable prefer-const */
import { BigInt } from '@graphprotocol/graph-ts';
import { ClaimPaid, LeftPool, PremiumDeposited, RiskPoolCreated, StakedInPool } from '../types/Cohort/Cohort'
import { Claim, Premium, PremiumPosition, RiskPool, Stake, StakePosition, Transaction, User, Withdraw } from '../types/schema'
import {convertTokenToDecimal, BI_18, ADDRESS_ZERO, ZERO_BD } from './helpers'

export function handleRiskPool(event: RiskPoolCreated): void {
  let pool = event.params._pool.toHexString();
  let riskPool = new RiskPool(pool) as RiskPool
  riskPool.cohort = event.params._cohort.toHexString()
  riskPool.blockNumber = event.block.number
  riskPool.timestamp = event.block.timestamp
  riskPool.pool = event.params._pool.toHexString()
  riskPool.totalSupply = ZERO_BD
  riskPool.save()
}

export function handleStakedInPool(event: StakedInPool): void {
  let transactionHash = event.transaction.hash.toHexString()
  let transaction = Transaction.load(transactionHash)
  if (transaction === null) {
    transaction = new Transaction(transactionHash)
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.from = event.transaction.from.toHexString()
    transaction.stakes = []
    transaction.withdraws = []
    transaction.claims = []
    transaction.premiums = []
  }

  let staker = event.params._staker.toHexString()
  let pool = event.params.pool.toHexString()
  let value = convertTokenToDecimal(event.params._amount, BI_18)

  let stakes = transaction.stakes
  let stake = new Stake(transactionHash.concat('-').concat(BigInt.fromI32(stakes.length).toString())) as Stake

  stake.transaction = transactionHash
  stake.blockNumber = event.block.number
  stake.timestamp = event.block.timestamp
  stake.staker = staker
  stake.pool = pool
  stake.amount = value
  stake.save()

  stakes.push(stake.id)
  transaction.stakes = stakes
  transaction.save()

  // save StakePosition
  let stakePosition = StakePosition.load(pool.concat('-').concat(staker))
  if (stakePosition === null) {
    stakePosition = new StakePosition(pool.concat('-').concat(staker))
    stakePosition.stakeBalance = ZERO_BD
  }
  stakePosition.pool = pool
  stakePosition.staker = staker
  stakePosition.stakeBalance = stakePosition.stakeBalance.plus(value)
  stakePosition.isStaking = true
  stakePosition.save()

  let user = User.load(staker)
  if (user === null) {
    user = new User(staker)
    user.totalStakeBalance = ZERO_BD
  }
  let stakePositions = user.stakePositions
  stakePositions.push(stakePosition.id)
  user.stakePositions = stakePositions
  user.totalStakeBalance = user.totalStakeBalance.plus(value)
  user.save()

  let riskPool = RiskPool.load(pool)
  riskPool.totalSupply = riskPool.totalSupply.plus(value)
  
  // save updated values
  riskPool.save()
}

export function handleLeftPool(event: LeftPool): void {
  let transactionHash = event.transaction.hash.toHexString()
  let transaction = Transaction.load(transactionHash)
  if (transaction === null) {
    transaction = new Transaction(transactionHash)
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.from = event.transaction.from.toHexString()
    transaction.stakes = []
    transaction.withdraws = []
    transaction.claims = []
    transaction.premiums = []
  }

  let staker = event.params._staker.toHexString()
  let pool = event.params._pool.toHexString()
  
  let stakePosition = StakePosition.load(pool.concat('-').concat(staker))
  if (stakePosition === null) {
    return
  }

  let withdraws = transaction.withdraws
  let withdraw = new Withdraw(transactionHash.concat('-').concat(BigInt.fromI32(withdraws.length).toString()))

  withdraw.transaction = transactionHash
  withdraw.blockNumber = event.block.number
  withdraw.timestamp = event.block.timestamp
  withdraw.pool = pool
  withdraw.to = staker
  withdraw.amount = stakePosition.stakeBalance
  withdraw.save()

  withdraws.push(withdraw.id)
  transaction.withdraws = withdraws
  transaction.save()

  stakePosition.isStaking = false
  stakePosition.save()
}

export function handleClaim(event: ClaimPaid): void {
  let transactionHash = event.transaction.hash.toHexString()
  let transaction = Transaction.load(transactionHash)
  if (transaction === null) {
    transaction = new Transaction(transactionHash)
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.from = event.transaction.from.toHexString()
    transaction.stakes = []
    transaction.withdraws = []
    transaction.claims = []
    transaction.premiums = []
  }
  let claimer = event.params._claimer.toHexString()
  let protocolIdx = event.params._protocolIdx
  let value = convertTokenToDecimal(event.params._amount, BI_18)

  let premiumPosition = PremiumPosition.load(protocolIdx.toString())
  if (premiumPosition === null) {
    return
  }

  let claims = transaction.claims
  let claim = new Claim(transactionHash.concat('-').concat(BigInt.fromI32(claims.length).toString()))

  claim.transaction = transactionHash
  claim.timestamp = event.block.timestamp
  claim.blockNumber = event.block.number
  claim.claimer = claimer
  claim.protocolIdx = protocolIdx
  claim.amount = value
  claim.save()

  claims.push(claim.id)
  transaction.claims = claims
  transaction.save()

  premiumPosition.premiumBalance = premiumPosition.premiumBalance.minus(value)
  premiumPosition.save()
}

export function handlePremiumDeposit(event: PremiumDeposited): void {
  let transactionHash = event.transaction.hash.toHexString()
  let transaction = Transaction.load(transactionHash)
  if (transaction === null) {
    transaction = new Transaction(transactionHash)
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.from = event.transaction.from.toHexString()
    transaction.stakes = []
    transaction.withdraws = []
    transaction.claims = []
    transaction.premiums = []
  }

  let cohort = event.params._cohort.toHexString()
  let protocolIdx = event.params._protocolIdx
  let value = convertTokenToDecimal(event.params._amount, BI_18)

  let premiums = transaction.premiums
  let premium = new Premium(transactionHash.concat('-').concat(BigInt.fromI32(premiums.length).toString()))

  premium.transaction = transactionHash
  premium.blockNumber = event.block.number
  premium.timestamp = event.block.timestamp
  premium.cohort = cohort
  premium.protocolIdx = BigInt.fromI32(protocolIdx)
  premium.amount = value
  premium.save()

  let premiumPosition = PremiumPosition.load(protocolIdx.toString())
  if (premiumPosition === null) {
    premiumPosition = new PremiumPosition(protocolIdx.toString())
    premiumPosition.premiumBalance = ZERO_BD
  }
  premiumPosition.premiumBalance = premiumPosition.premiumBalance.plus(value)
  premiumPosition.save()
}
