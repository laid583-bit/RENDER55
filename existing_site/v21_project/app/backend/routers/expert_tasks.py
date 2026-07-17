import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.expert_tasks import Expert_tasksService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/expert_tasks", tags=["expert_tasks"])


# ---------- Pydantic Schemas ----------
class Expert_tasksData(BaseModel):
    """Entity data schema (for create/update)"""
    from_currency: str
    to_currency: str
    amount: float
    status: str
    executed_count: int = None
    skipped_count: int = None
    total_fees: str = None
    last_rate: float = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Expert_tasksUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    from_currency: Optional[str] = None
    to_currency: Optional[str] = None
    amount: Optional[float] = None
    status: Optional[str] = None
    executed_count: Optional[int] = None
    skipped_count: Optional[int] = None
    total_fees: Optional[str] = None
    last_rate: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Expert_tasksResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    from_currency: str
    to_currency: str
    amount: float
    status: str
    executed_count: Optional[int] = None
    skipped_count: Optional[int] = None
    total_fees: Optional[str] = None
    last_rate: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Expert_tasksListResponse(BaseModel):
    """List response schema"""
    items: List[Expert_tasksResponse]
    total: int
    skip: int
    limit: int


class Expert_tasksBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Expert_tasksData]


class Expert_tasksBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Expert_tasksUpdateData


class Expert_tasksBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Expert_tasksBatchUpdateItem]


class Expert_tasksBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Expert_tasksListResponse)
async def query_expert_taskss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query expert_taskss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying expert_taskss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Expert_tasksService(db)
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
        logger.debug(f"Found {result['total']} expert_taskss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying expert_taskss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Expert_tasksListResponse)
async def query_expert_taskss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query expert_taskss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying expert_taskss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Expert_tasksService(db)
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
        logger.debug(f"Found {result['total']} expert_taskss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying expert_taskss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Expert_tasksResponse)
async def get_expert_tasks(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single expert_tasks by ID (user can only see their own records)"""
    logger.debug(f"Fetching expert_tasks with id: {id}, fields={fields}")
    
    service = Expert_tasksService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Expert_tasks with id {id} not found")
            raise HTTPException(status_code=404, detail="Expert_tasks not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching expert_tasks {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Expert_tasksResponse, status_code=201)
async def create_expert_tasks(
    data: Expert_tasksData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new expert_tasks"""
    logger.debug(f"Creating new expert_tasks with data: {data}")
    
    service = Expert_tasksService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create expert_tasks")
        
        logger.info(f"Expert_tasks created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating expert_tasks: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating expert_tasks: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Expert_tasksResponse], status_code=201)
async def create_expert_taskss_batch(
    request: Expert_tasksBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple expert_taskss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} expert_taskss")
    
    service = Expert_tasksService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} expert_taskss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Expert_tasksResponse])
async def update_expert_taskss_batch(
    request: Expert_tasksBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple expert_taskss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} expert_taskss")
    
    service = Expert_tasksService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} expert_taskss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Expert_tasksResponse)
async def update_expert_tasks(
    id: int,
    data: Expert_tasksUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing expert_tasks (requires ownership)"""
    logger.debug(f"Updating expert_tasks {id} with data: {data}")

    service = Expert_tasksService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Expert_tasks with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Expert_tasks not found")
        
        logger.info(f"Expert_tasks {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating expert_tasks {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating expert_tasks {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_expert_taskss_batch(
    request: Expert_tasksBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple expert_taskss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} expert_taskss")
    
    service = Expert_tasksService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} expert_taskss successfully")
        return {"message": f"Successfully deleted {deleted_count} expert_taskss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_expert_tasks(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single expert_tasks by ID (requires ownership)"""
    logger.debug(f"Deleting expert_tasks with id: {id}")
    
    service = Expert_tasksService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Expert_tasks with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Expert_tasks not found")
        
        logger.info(f"Expert_tasks {id} deleted successfully")
        return {"message": "Expert_tasks deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting expert_tasks {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")