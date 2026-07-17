import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.deposits import DepositsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/deposits", tags=["deposits"])


# ---------- Pydantic Schemas ----------
class DepositsData(BaseModel):
    """Entity data schema (for create/update)"""
    amount: float
    currency: str
    payment_method: str
    wallet_address: str = None
    status: str
    notes: str = None


class DepositsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    amount: Optional[float] = None
    currency: Optional[str] = None
    payment_method: Optional[str] = None
    wallet_address: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class DepositsResponse(BaseModel):
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


class DepositsListResponse(BaseModel):
    """List response schema"""
    items: List[DepositsResponse]
    total: int
    skip: int
    limit: int


class DepositsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[DepositsData]


class DepositsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: DepositsUpdateData


class DepositsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[DepositsBatchUpdateItem]


class DepositsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=DepositsListResponse)
async def query_depositss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query depositss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying depositss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = DepositsService(db)
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
        logger.debug(f"Found {result['total']} depositss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying depositss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=DepositsListResponse)
async def query_depositss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query depositss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying depositss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = DepositsService(db)
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
        logger.debug(f"Found {result['total']} depositss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying depositss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=DepositsResponse)
async def get_deposits(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single deposits by ID (user can only see their own records)"""
    logger.debug(f"Fetching deposits with id: {id}, fields={fields}")
    
    service = DepositsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Deposits with id {id} not found")
            raise HTTPException(status_code=404, detail="Deposits not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching deposits {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=DepositsResponse, status_code=201)
async def create_deposits(
    data: DepositsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new deposits"""
    logger.debug(f"Creating new deposits with data: {data}")
    
    service = DepositsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create deposits")
        
        logger.info(f"Deposits created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating deposits: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating deposits: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[DepositsResponse], status_code=201)
async def create_depositss_batch(
    request: DepositsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple depositss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} depositss")
    
    service = DepositsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} depositss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[DepositsResponse])
async def update_depositss_batch(
    request: DepositsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple depositss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} depositss")
    
    service = DepositsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} depositss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=DepositsResponse)
async def update_deposits(
    id: int,
    data: DepositsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing deposits (requires ownership)"""
    logger.debug(f"Updating deposits {id} with data: {data}")

    service = DepositsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Deposits with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Deposits not found")
        
        logger.info(f"Deposits {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating deposits {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating deposits {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_depositss_batch(
    request: DepositsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple depositss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} depositss")
    
    service = DepositsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} depositss successfully")
        return {"message": f"Successfully deleted {deleted_count} depositss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_deposits(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single deposits by ID (requires ownership)"""
    logger.debug(f"Deleting deposits with id: {id}")
    
    service = DepositsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Deposits with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Deposits not found")
        
        logger.info(f"Deposits {id} deleted successfully")
        return {"message": "Deposits deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting deposits {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")