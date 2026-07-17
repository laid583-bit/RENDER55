import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.withdrawals import WithdrawalsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/withdrawals", tags=["withdrawals"])


# ---------- Pydantic Schemas ----------
class WithdrawalsData(BaseModel):
    """Entity data schema (for create/update)"""
    amount: float
    currency: str
    payment_method: str
    wallet_address: str = None
    status: str
    notes: str = None


class WithdrawalsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    amount: Optional[float] = None
    currency: Optional[str] = None
    payment_method: Optional[str] = None
    wallet_address: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class WithdrawalsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    amount: float
    currency: str
    payment_method: str
    wallet_address: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WithdrawalsListResponse(BaseModel):
    """List response schema"""
    items: List[WithdrawalsResponse]
    total: int
    skip: int
    limit: int


class WithdrawalsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[WithdrawalsData]


class WithdrawalsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: WithdrawalsUpdateData


class WithdrawalsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[WithdrawalsBatchUpdateItem]


class WithdrawalsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=WithdrawalsListResponse)
async def query_withdrawalss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query withdrawalss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying withdrawalss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = WithdrawalsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(current_user.id),
        )
        logger.debug(f"Found {result['total']} withdrawalss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying withdrawalss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=WithdrawalsListResponse)
async def query_withdrawalss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query withdrawalss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying withdrawalss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = WithdrawalsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} withdrawalss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying withdrawalss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=WithdrawalsResponse)
async def get_withdrawals(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single withdrawals by ID (user can only see their own records)"""
    logger.debug(f"Fetching withdrawals with id: {id}, fields={fields}")
    
    service = WithdrawalsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Withdrawals with id {id} not found")
            raise HTTPException(status_code=404, detail="Withdrawals not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching withdrawals {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=WithdrawalsResponse, status_code=201)
async def create_withdrawals(
    data: WithdrawalsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new withdrawals"""
    logger.debug(f"Creating new withdrawals with data: {data}")
    
    service = WithdrawalsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create withdrawals")
        
        logger.info(f"Withdrawals created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating withdrawals: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating withdrawals: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[WithdrawalsResponse], status_code=201)
async def create_withdrawalss_batch(
    request: WithdrawalsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple withdrawalss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} withdrawalss")
    
    service = WithdrawalsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} withdrawalss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[WithdrawalsResponse])
async def update_withdrawalss_batch(
    request: WithdrawalsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple withdrawalss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} withdrawalss")
    
    service = WithdrawalsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} withdrawalss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=WithdrawalsResponse)
async def update_withdrawals(
    id: int,
    data: WithdrawalsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing withdrawals (requires ownership)"""
    logger.debug(f"Updating withdrawals {id} with data: {data}")

    service = WithdrawalsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Withdrawals with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Withdrawals not found")
        
        logger.info(f"Withdrawals {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating withdrawals {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating withdrawals {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_withdrawalss_batch(
    request: WithdrawalsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple withdrawalss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} withdrawalss")
    
    service = WithdrawalsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} withdrawalss successfully")
        return {"message": f"Successfully deleted {deleted_count} withdrawalss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_withdrawals(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single withdrawals by ID (requires ownership)"""
    logger.debug(f"Deleting withdrawals with id: {id}")
    
    service = WithdrawalsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Withdrawals with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Withdrawals not found")
        
        logger.info(f"Withdrawals {id} deleted successfully")
        return {"message": "Withdrawals deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting withdrawals {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")